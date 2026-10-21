import assert from "node:assert/strict";
import { EventEmitter, once } from "node:events";
import { after, before, test } from "node:test";
import jwt from "jsonwebtoken";
import AppError from "../src/utils/app-error.js";

process.env.JWT_SECRET = "lockship-test-secret-with-at-least-32-characters";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/lockship-test";
process.env.MQTT_URL = "mqtts://mqtt.example.test:8883";
process.env.MQTT_USERNAME = "test-client";
process.env.MQTT_PASSWORD = "test-password";
process.env.MQTT_DEVICE_TOKEN_SECRET = "lockship-device-test-secret-with-32-characters";

const { env } = await import("../src/config/env.js");
const { default: IoTDevice } = await import("../src/models/iot-device.model.js");
const { default: IoTEvent } = await import("../src/models/iot-event.model.js");
const { default: Notification } = await import("../src/models/notification.model.js");
const { default: Delivery } = await import("../src/models/delivery.model.js");
const { default: Vehicle } = await import("../src/models/vehicle.model.js");
const { default: app } = await import("../src/app.js");
const iotService = await import("../src/services/iot-device.service.js");
const mqttClientService = await import("../src/services/mqtt-client.js");
const mqttService = await import("../src/services/mqtt.service.js");
let server;
let baseUrl;

before(async () => {
    server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
    await mqttService.stopMqtt();
    if (server?.listening) {
        server.close();
        server.closeAllConnections();
        await once(server, "close");
    }
});

function makeDeviceToken(deviceId) {
    return makeDeviceCredentialToken(deviceId, "test-device-credential");
}

function makeDeviceCredentialToken(deviceId, credentialId) {
    return jwt.sign(
        { scope: "iot-device" },
        env.MQTT_DEVICE_TOKEN_SECRET,
        { subject: deviceId, jwtid: credentialId, audience: "lockship-iot-device", expiresIn: "1h" },
    );
}

test("IoT REST API is mounted and requires user authentication", async () => {
    const response = await fetch(`${baseUrl}/api/iot`);
    assert.equal(response.status, 401);
});

test("authenticated device status updates database fields and logs sanitized telemetry", async () => {
    const originalFind = IoTDevice.findOne;
    const originalUpdate = IoTDevice.findOneAndUpdate;
    const originalLogCreate = IoTEvent.create;
    const deviceId = "lock_device_01";
    const device = {
        _id: "507f1f77bcf86cd799439011",
        deviceId,
        ownerId: "507f1f77bcf86cd799439012",
        credentialId: "test-device-credential",
    };
    const token = makeDeviceToken(deviceId);
    let receivedUpdate;
    let eventRecord;

    IoTDevice.findOne = async (filter) => {
        assert.deepEqual(filter, { deviceId });
        return device;
    };
    IoTDevice.findOneAndUpdate = async (_filter, update) => {
        receivedUpdate = update.$set;
        return { ...device, ...update.$set };
    };
    IoTEvent.create = async (entry) => {
        eventRecord = entry;
        return entry;
    };

    try {
        const updated = await iotService.processDeviceMessage(
            `lockship/device/${deviceId}/status`,
            Buffer.from(JSON.stringify({
                deviceToken: token,
                status: "online",
                lockStatus: "locked",
                battery: 84,
                firmwareVersion: "2.1.0",
                accessToken: "must-not-be-logged",
            })),
        );

        assert.equal(receivedUpdate.status, "online");
        assert.equal(receivedUpdate.lockStatus, "locked");
        assert.equal(receivedUpdate.battery, 84);
        assert.equal(receivedUpdate.firmwareVersion, "2.1.0");
        assert.ok(receivedUpdate.lastSeen instanceof Date);
        assert.equal(updated.status, "online");
        assert.equal(eventRecord.type, "device_status");
        assert.equal(eventRecord.payload.accessToken, undefined);
    } finally {
        IoTDevice.findOne = originalFind;
        IoTDevice.findOneAndUpdate = originalUpdate;
        IoTEvent.create = originalLogCreate;
    }
});

test("owner device queries are scoped while admin queries remain global", async () => {
    const originalFind = IoTDevice.find;
    const ownerId = "507f1f77bcf86cd799439012";
    const receivedFilters = [];
    IoTDevice.find = (filter) => ({
        sort: () => {
            receivedFilters.push(filter);
            return [];
        },
    });

    try {
        await iotService.listDevices("owner", ownerId);
        await iotService.listDevices("admin", "507f1f77bcf86cd799439013");
        assert.deepEqual(receivedFilters, [{ ownerId }, {}]);
    } finally {
        IoTDevice.find = originalFind;
    }
});

test("device message with a token for a different device is rejected", async () => {
    const originalFind = IoTDevice.findOne;
    const deviceId = "lock_device_01";
    IoTDevice.findOne = async () => {
        throw new Error("Database lookup must not happen for a forged topic token.");
    };

    try {
        await assert.rejects(
            iotService.processDeviceMessage(
                `lockship/device/${deviceId}/status`,
                Buffer.from(JSON.stringify({ deviceToken: makeDeviceToken("another_device") })),
            ),
            (error) => error instanceof AppError && error.statusCode === 401,
        );
    } finally {
        IoTDevice.findOne = originalFind;
    }
});

test("a device credential issued before deletion cannot authenticate a re-registered device", async () => {
    const originalFind = IoTDevice.findOne;
    const deviceId = "lock_device_reregistered";
    IoTDevice.findOne = async () => ({
        deviceId,
        credentialId: "new-device-credential",
    });

    try {
        await assert.rejects(
            iotService.processDeviceMessage(
                `lockship/device/${deviceId}/status`,
                Buffer.from(JSON.stringify({
                    deviceToken: makeDeviceCredentialToken(deviceId, "old-device-credential"),
                })),
            ),
            (error) => error instanceof AppError && error.statusCode === 401,
        );
    } finally {
        IoTDevice.findOne = originalFind;
    }
});

test("IoT device credential identifiers are not included in JSON responses", () => {
    const device = new IoTDevice({
        deviceId: "lock_device_json",
        credentialId: "private-device-credential",
        vehicleId: "507f1f77bcf86cd799439016",
        ownerId: "507f1f77bcf86cd799439012",
    });

    assert.equal(Object.hasOwn(device.toJSON(), "credentialId"), false);
});

test("IoT event and alert topics require valid signed device tokens", async () => {
    const originalFind = IoTDevice.findOne;
    const deviceId = "lock_device_02";
    const token = makeDeviceToken(deviceId);
    let lookupCount = 0;
    IoTDevice.findOne = async () => {
        lookupCount += 1;
        return null;
    };

    try {
        for (const topic of ["event", "alert"]) {
            await assert.rejects(
                iotService.processDeviceMessage(
                    `lockship/device/${deviceId}/${topic}`,
                    Buffer.from(JSON.stringify({ deviceToken: token, event: "test" })),
                ),
                (error) => error instanceof AppError && error.statusCode === 404,
            );
        }
        assert.equal(lookupCount, 2);
    } finally {
        IoTDevice.findOne = originalFind;
    }
});

test("heartbeat timeout marks online devices offline and creates an event log", async () => {
    const originalFind = IoTDevice.find;
    const originalUpdate = IoTDevice.findOneAndUpdate;
    const originalEventCreate = IoTEvent.create;
    const staleDevice = {
        _id: "507f1f77bcf86cd799439011",
        deviceId: "lock_device_stale",
        ownerId: "507f1f77bcf86cd799439012",
        lastSeen: new Date(Date.now() - 120000),
    };
    let staleFilter;
    let offlineFilter;
    let eventRecord;
    IoTDevice.find = (filter) => {
        staleFilter = filter;
        return Promise.resolve([staleDevice]);
    };
    IoTDevice.findOneAndUpdate = async (filter) => {
        offlineFilter = filter;
        return { ...staleDevice, status: "offline" };
    };
    IoTEvent.create = async (entry) => {
        eventRecord = entry;
        return entry;
    };

    try {
        await iotService.markStaleDevicesOffline();
        assert.equal(staleFilter.status, "online");
        assert.ok(staleFilter.lastSeen.$lt instanceof Date);
        assert.equal(offlineFilter.status, "online");
        assert.equal(eventRecord.type, "device_offline");
        assert.equal(eventRecord.payload.reason, "heartbeat_timeout");
    } finally {
        IoTDevice.find = originalFind;
        IoTDevice.findOneAndUpdate = originalUpdate;
        IoTEvent.create = originalEventCreate;
    }
});

test("authenticated unlock failure alert is logged and notifies its owner", async () => {
    const originalFind = IoTDevice.findOne;
    const originalUpdate = IoTDevice.findOneAndUpdate;
    const originalEventCreate = IoTEvent.create;
    const originalNotificationCreate = Notification.create;
    const deviceId = "lock_device_04";
    const ownerId = "507f1f77bcf86cd799439012";
    const deliveryId = "507f1f77bcf86cd799439013";
    const token = makeDeviceToken(deviceId);
    let loggedEvent;
    let ownerNotification;
    IoTDevice.findOne = async () => ({
        _id: "507f1f77bcf86cd799439011",
        deviceId,
        ownerId,
        credentialId: "test-device-credential",
    });
    IoTDevice.findOneAndUpdate = async (_filter, update) => ({ ...update.$set });
    IoTEvent.create = async (entry) => {
        loggedEvent = entry;
        return entry;
    };
    Notification.create = async (entry) => {
        ownerNotification = entry;
        return entry;
    };

    try {
        await iotService.processDeviceMessage(
            `lockship/device/${deviceId}/alert`,
            Buffer.from(JSON.stringify({
                deviceToken: token,
                event: "unlock_failed",
                deliveryId,
                code: "123456",
                reason: "internal-device-detail",
            })),
        );

        assert.equal(loggedEvent.type, "unlock_failed");
        assert.equal(loggedEvent.payload.code, undefined);
        assert.equal(ownerNotification.userId, ownerId);
        assert.equal(ownerNotification.type, "iot_unlock_failed");
        assert.match(ownerNotification.message, new RegExp(deliveryId));
        assert.equal(ownerNotification.message.includes("123456"), false);
        assert.equal(ownerNotification.message.includes("internal-device-detail"), false);
    } finally {
        IoTDevice.findOne = originalFind;
        IoTDevice.findOneAndUpdate = originalUpdate;
        IoTEvent.create = originalEventCreate;
        Notification.create = originalNotificationCreate;
    }
});

test("offline device returns DEVICE_OFFLINE before code consumption", async () => {
    const originalFind = IoTDevice.findOne;
    const originalVehicleFind = Vehicle.findOne;
    Vehicle.findOne = async () => ({ iotDeviceId: "lock_device_offline" });
    IoTDevice.findOne = async () => ({ status: "offline" });

    try {
        await assert.rejects(
            iotService.assertVerifiedUnlockReady("507f1f77bcf86cd799439016", "507f1f77bcf86cd799439012"),
            (error) => error instanceof AppError
                && error.statusCode === 503
                && error.errorCode === "DEVICE_OFFLINE",
        );
    } finally {
        IoTDevice.findOne = originalFind;
        Vehicle.findOne = originalVehicleFind;
    }
});

test("MQTT publish failure marks unlock failed, logs, and notifies both parties", async () => {
    const originals = {
        deviceFind: IoTDevice.findOne,
        vehicleFind: Vehicle.findOne,
        deliveryFind: Delivery.findOne,
        deliveryUpdate: Delivery.findOneAndUpdate,
        eventCreate: IoTEvent.create,
        eventUpdate: IoTEvent.updateOne,
        notificationInsert: Notification.insertMany,
    };
    const deviceId = "lock_device_failed_publish";
    const ownerId = "507f1f77bcf86cd799439012";
    const shipperId = "507f1f77bcf86cd799439017";
    const deliveryId = "507f1f77bcf86cd799439013";
    const device = {
        _id: "507f1f77bcf86cd799439011",
        deviceId,
        credentialId: "test-device-credential",
        ownerId,
        vehicleId: "507f1f77bcf86cd799439016",
        status: "online",
    };
    let failedDeliveryUpdate;
    const eventRecords = [];
    let notifications;
    const fakeClient = {
        connected: true,
        publish(_topic, _message, _options, callback) {
            callback(new Error("broker rejected publish"));
        },
    };

    mqttClientService.setMqttClient(fakeClient);
    Vehicle.findOne = async () => ({
        _id: device.vehicleId,
        ownerId,
        status: "active",
        iotDeviceId: deviceId,
    });
    IoTDevice.findOne = async () => device;
    Delivery.findOne = async () => ({
        _id: deliveryId,
        id: deliveryId,
        ownerId,
        shipperId,
        vehicleId: device.vehicleId,
        status: "authorized",
        unlockStatus: "pending",
    });
    Delivery.findOneAndUpdate = async (_filter, update) => {
        failedDeliveryUpdate = update.$set;
        return { unlockStatus: update.$set.unlockStatus };
    };
    IoTEvent.create = async (entry) => {
        const record = { _id: `event-${eventRecords.length + 1}`, ...entry };
        eventRecords.push(record);
        return record;
    };
    IoTEvent.updateOne = async () => ({ modifiedCount: 1 });
    Notification.insertMany = async (entries) => {
        notifications = entries;
        return entries;
    };

    try {
        await assert.rejects(
            iotService.publishVerifiedUnlock(device.vehicleId, ownerId, deliveryId),
            (error) => error instanceof AppError
                && error.statusCode === 503
                && error.errorCode === "DEVICE_OFFLINE",
        );
        assert.equal(failedDeliveryUpdate.unlockStatus, "failed");
        assert.equal(eventRecords[0].type, "unlock_command_requested");
        assert.equal(eventRecords[1].type, "unlock_failed");
        assert.equal(eventRecords[1].payload.errorCode, "DEVICE_OFFLINE");
        assert.equal(notifications.length, 2);
    } finally {
        mqttClientService.setMqttClient(null);
        IoTDevice.findOne = originals.deviceFind;
        Vehicle.findOne = originals.vehicleFind;
        Delivery.findOne = originals.deliveryFind;
        Delivery.findOneAndUpdate = originals.deliveryUpdate;
        IoTEvent.create = originals.eventCreate;
        IoTEvent.updateOne = originals.eventUpdate;
        Notification.insertMany = originals.notificationInsert;
    }
});

async function simulateUnlockResult(success) {
    const originals = {
        deviceFind: IoTDevice.findOne,
        deviceUpdate: IoTDevice.findOneAndUpdate,
        eventFind: IoTEvent.findOne,
        eventCreate: IoTEvent.create,
        eventUpdate: IoTEvent.updateOne,
        deliveryUpdate: Delivery.findOneAndUpdate,
        notificationInsert: Notification.insertMany,
    };
    const deviceId = "lock_device_result";
    const ownerId = "507f1f77bcf86cd799439012";
    const shipperId = "507f1f77bcf86cd799439017";
    const deliveryId = "507f1f77bcf86cd799439013";
    const requestId = "11111111-1111-4111-8111-111111111111";
    const device = {
        _id: "507f1f77bcf86cd799439011",
        deviceId,
        credentialId: "test-device-credential",
        ownerId,
        vehicleId: "507f1f77bcf86cd799439016",
    };
    const commandEvent = {
        _id: "507f1f77bcf86cd799439018",
        payload: { ownerId, shipperId, deliveryId, requestId, command: "UNLOCK" },
    };
    const result = { success, deliveryId, requestId, device, deviceUpdate: null, deliveryFilter: null, deliveryUpdate: null, log: null, notifications: null };

    IoTDevice.findOne = async () => device;
    IoTDevice.findOneAndUpdate = async (_filter, update) => {
        result.deviceUpdate = update.$set;
        return { ...device, ...update.$set };
    };
    IoTEvent.findOne = async () => commandEvent;
    IoTEvent.create = async (entry) => {
        result.log = entry;
        return entry;
    };
    IoTEvent.updateOne = async () => ({ modifiedCount: 1 });
    Delivery.findOneAndUpdate = async (filter, update) => {
        result.deliveryFilter = filter;
        result.deliveryUpdate = update.$set;
        return { _id: deliveryId, ...update.$set };
    };
    Notification.insertMany = async (entries) => {
        result.notifications = entries;
        return entries;
    };

    try {
        await iotService.processDeviceMessage(
            `lockship/device/${deviceId}/event`,
            Buffer.from(JSON.stringify({
                deviceToken: makeDeviceToken(deviceId),
                event: "unlock_result",
                command: "UNLOCK",
                requestId,
                deliveryId,
                success,
                lockStatus: success ? "unlocked" : "locked",
                details: "device reported an execution result",
            })),
        );
        return result;
    } finally {
        IoTDevice.findOne = originals.deviceFind;
        IoTDevice.findOneAndUpdate = originals.deviceUpdate;
        IoTEvent.findOne = originals.eventFind;
        IoTEvent.create = originals.eventCreate;
        IoTEvent.updateOne = originals.eventUpdate;
        Delivery.findOneAndUpdate = originals.deliveryUpdate;
        Notification.insertMany = originals.notificationInsert;
    }
}

test("successful IoT unlock result updates lock and delivery and notifies shipper", async () => {
    const result = await simulateUnlockResult(true);

    assert.equal(result.deliveryUpdate.unlockStatus, "succeeded");
    assert.equal(result.deviceUpdate.lockStatus, "unlocked");
    assert.equal(result.deviceUpdate.status, "online");
    assert.equal(result.log.type, "unlock_succeeded");
    assert.equal(result.notifications.length, 1);
    assert.equal(result.notifications[0].userId, "507f1f77bcf86cd799439017");
});

test("failed IoT unlock result leaves delivery incomplete and notifies owner and shipper", async () => {
    const result = await simulateUnlockResult(false);

    assert.equal(result.deliveryUpdate.unlockStatus, "failed");
    assert.equal(result.deviceUpdate.lockStatus, "locked");
    assert.equal(result.log.type, "unlock_failed");
    assert.equal(result.log.payload.errorCode, "DEVICE_UNLOCK_FAILED");
    assert.equal(result.notifications.length, 2);
    assert.deepEqual(
        new Set(result.notifications.map(({ userId }) => userId)),
        new Set(["507f1f77bcf86cd799439012", "507f1f77bcf86cd799439017"]),
    );
    assert.equal(result.notifications.every(({ message }) => !message.includes("device reported")), true);
});

test("user command publisher sends safe commands and blocks direct UNLOCK", async () => {
    const originalDeviceFind = IoTDevice.findOne;
    const originalEventCreate = IoTEvent.create;
    const published = [];
    const fakeClient = {
        connected: true,
        publish(topic, message, options, callback) {
            published.push({ topic, message: JSON.parse(message), options });
            callback(null);
        },
    };
    const device = {
        _id: "507f1f77bcf86cd799439011",
        deviceId: "lock_device_03",
        ownerId: "507f1f77bcf86cd799439012",
        status: "online",
    };

    mqttClientService.setMqttClient(fakeClient);
    IoTDevice.findOne = async () => device;
    IoTEvent.create = async (entry) => entry;

    try {
        const result = await iotService.publishUserCommand("owner", device.ownerId, device._id, "LOCK");
        assert.equal(result.command, "LOCK");
        assert.equal(published[0].topic, "lockship/device/lock_device_03/command");
        assert.equal(published[0].options.qos, 1);
        assert.equal(published[0].message.command, "LOCK");

        await assert.rejects(
            iotService.publishUserCommand("owner", device.ownerId, device._id, "UNLOCK"),
            (error) => error instanceof AppError && error.statusCode === 403,
        );
        assert.equal(published.length, 1);
    } finally {
        mqttClientService.setMqttClient(null);
        IoTDevice.findOne = originalDeviceFind;
        IoTEvent.create = originalEventCreate;
    }
});

test("MQTT client authenticates to broker and subscribes only to inbound device topics", async () => {
    const fakeClient = new EventEmitter();
    let connectUrl;
    let connectOptions;
    let subscription;
    fakeClient.subscribe = (topics, options, callback) => {
        subscription = { topics, options };
        callback(null, []);
    };
    fakeClient.end = (_force, _options, callback) => callback();
    const connect = (url, options) => {
        connectUrl = url;
        connectOptions = options;
        return fakeClient;
    };

    try {
        const started = mqttService.startMqtt(connect);
        assert.equal(started, fakeClient);
        assert.equal(connectUrl, env.MQTT_URL);
        assert.equal(connectOptions.username, env.MQTT_USERNAME);
        assert.equal(connectOptions.password, env.MQTT_PASSWORD);
        fakeClient.emit("connect");
        assert.deepEqual(subscription.topics, [
            "lockship/device/+/status",
            "lockship/device/+/event",
            "lockship/device/+/alert",
        ]);
        assert.deepEqual(subscription.options, { qos: 1 });
    } finally {
        await mqttService.stopMqtt();
    }
});
