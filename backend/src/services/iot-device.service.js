import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import Delivery from "../models/delivery.model.js";
import IoTDevice from "../models/iot-device.model.js";
import IoTEvent from "../models/iot-event.model.js";
import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";
import Vehicle from "../models/vehicle.model.js";
import AppError from "../utils/app-error.js";
import { isMqttConnected, publishMqttCommand } from "./mqtt-client.js";
import { createNotification, emitNotificationNew } from "./notification.service.js";
import { emitToUser, emitToUsers } from "./socket.service.js";

const commandNames = ["LOCK", "UNLOCK", "STATUS", "PING"];
const deviceTokenAudience = "lockship-iot-device";

function getDeviceScope(role, userId) {
    if (role === "owner") {
        return { ownerId: userId };
    }
    if (role === "admin") {
        return {};
    }
    throw new AppError("You do not have permission to manage IoT devices.", 403);
}

function validateObjectId(value, fieldName) {
    if (!mongoose.isValidObjectId(value)) {
        throw new AppError(`${fieldName} must be a valid MongoDB ObjectId.`, 400);
    }
}

function signDeviceToken(deviceId, credentialId) {
    return jwt.sign(
        { scope: "iot-device" },
        env.MQTT_DEVICE_TOKEN_SECRET,
        {
            subject: deviceId,
            jwtid: credentialId,
            audience: deviceTokenAudience,
            expiresIn: env.MQTT_DEVICE_TOKEN_TTL,
        },
    );
}

async function requireActiveOwner(ownerId) {
    const owner = await User.findOne({ _id: ownerId, role: "owner", status: "active" });
    if (!owner) {
        throw new AppError("An active owner with this ID was not found.", 422);
    }
}

async function requireAvailableVehicle(vehicleId, ownerId) {
    validateObjectId(vehicleId, "vehicleId");
    const vehicle = await Vehicle.findOne({ _id: vehicleId, ownerId, status: "active" });
    if (!vehicle) {
        throw new AppError("An active vehicle owned by this user is required.", 422);
    }
    return vehicle;
}

export async function listDevices(role, userId) {
    return IoTDevice.find(getDeviceScope(role, userId)).sort({ createdAt: -1 });
}

export async function getDevice(role, userId, deviceRecordId) {
    validateObjectId(deviceRecordId, "device ID");
    const device = await IoTDevice.findOne({
        _id: deviceRecordId,
        ...getDeviceScope(role, userId),
    });
    if (!device) {
        throw new AppError("IoT device was not found.", 404);
    }
    return device;
}

export async function createDevice(role, userId, input) {
    const ownerId = role === "owner" ? userId : input.ownerId;
    if (!ownerId || !mongoose.isValidObjectId(ownerId)) {
        throw new AppError("A valid ownerId is required.", 422);
    }
    if (role !== "owner" && role !== "admin") {
        throw new AppError("You do not have permission to create IoT devices.", 403);
    }
    await requireActiveOwner(ownerId);

    if (await IoTDevice.exists({ deviceId: input.deviceId })) {
        throw new AppError("An IoT device with this deviceId already exists.", 409);
    }
    if (await IoTDevice.exists({ vehicleId: input.vehicleId })) {
        throw new AppError("This vehicle already has an IoT device.", 409);
    }

    const vehicle = await requireAvailableVehicle(input.vehicleId, ownerId);
    if (vehicle.iotDeviceId && vehicle.iotDeviceId !== input.deviceId) {
        throw new AppError("This vehicle is already linked to another IoT device.", 409);
    }

    const linkedVehicle = await Vehicle.findOneAndUpdate(
        {
            _id: input.vehicleId,
            ownerId,
            status: "active",
            $or: [{ iotDeviceId: null }, { iotDeviceId: { $exists: false } }, { iotDeviceId: input.deviceId }],
        },
        { $set: { iotDeviceId: input.deviceId } },
        { new: true },
    );
    if (!linkedVehicle) {
        throw new AppError("This vehicle could not be linked to the IoT device.", 409);
    }

    let device;
    try {
        device = await IoTDevice.create({
            deviceId: input.deviceId,
            vehicleId: input.vehicleId,
            ownerId,
        });
    } catch (error) {
        await Vehicle.updateOne(
            { _id: input.vehicleId, ownerId, iotDeviceId: input.deviceId },
            { $set: { iotDeviceId: null } },
        );
        throw error;
    }

    return { device, deviceToken: signDeviceToken(device.deviceId, device.credentialId) };
}

export async function updateDevice(role, userId, deviceRecordId, updates) {
    const device = await getDevice(role, userId, deviceRecordId);
    if (updates.vehicleId === undefined) {
        throw new AppError("Only vehicleId can be changed.", 422);
    }
    if (updates.vehicleId === String(device.vehicleId)) {
        return device;
    }

    const newVehicle = await requireAvailableVehicle(updates.vehicleId, device.ownerId);
    if (newVehicle.iotDeviceId && newVehicle.iotDeviceId !== device.deviceId) {
        throw new AppError("This vehicle is already linked to another IoT device.", 409);
    }

    const linkedVehicle = await Vehicle.findOneAndUpdate(
        {
            _id: updates.vehicleId,
            ownerId: device.ownerId,
            status: "active",
            $or: [{ iotDeviceId: null }, { iotDeviceId: { $exists: false } }],
        },
        { $set: { iotDeviceId: device.deviceId } },
        { new: true },
    );
    if (!linkedVehicle) {
        throw new AppError("This vehicle could not be linked to the IoT device.", 409);
    }

    const previousVehicleId = device.vehicleId;
    device.vehicleId = updates.vehicleId;
    try {
        await device.save();
    } catch (error) {
        await Vehicle.updateOne(
            { _id: updates.vehicleId, ownerId: device.ownerId, iotDeviceId: device.deviceId },
            { $set: { iotDeviceId: null } },
        );
        throw error;
    }

    await Vehicle.updateOne(
        { _id: previousVehicleId, ownerId: device.ownerId, iotDeviceId: device.deviceId },
        { $set: { iotDeviceId: null } },
    );
    return device;
}

export async function deleteDevice(role, userId, deviceRecordId) {
    const device = await getDevice(role, userId, deviceRecordId);
    await Vehicle.updateOne(
        { _id: device.vehicleId, ownerId: device.ownerId, iotDeviceId: device.deviceId },
        { $set: { iotDeviceId: null } },
    );
    await device.deleteOne();
}

export async function getDeviceStatus(role, userId, deviceRecordId) {
    const device = await getDevice(role, userId, deviceRecordId);
    return {
        deviceId: device.deviceId,
        status: device.status,
        lockStatus: device.lockStatus,
        battery: device.battery,
        lastSeen: device.lastSeen,
        firmwareVersion: device.firmwareVersion,
    };
}

export async function listDeviceLogs(role, userId, deviceRecordId) {
    const device = await getDevice(role, userId, deviceRecordId);
    return IoTEvent.find({ deviceId: device.deviceId, ownerId: device.ownerId })
        .sort({ createdAt: -1 })
        .limit(200);
}

export async function publishUserCommand(role, userId, deviceRecordId, command) {
    if (!commandNames.includes(command)) {
        throw new AppError("Unsupported IoT command.", 422);
    }
    if (command === "UNLOCK") {
        throw new AppError("UNLOCK commands require a verified delivery unlock code.", 403);
    }

    const device = await getDevice(role, userId, deviceRecordId);
    const result = await publishMqttCommand(device.deviceId, command, { requestId: randomUUID() });
    await IoTEvent.create({
        deviceId: device.deviceId,
        ownerId: device.ownerId,
        type: "command_published",
        topic: result.topic,
        payload: { command, requestId: result.requestId },
    });
    return result;
}

function sanitizePayload(value, depth = 0) {
    if (depth > 6) {
        return "[depth limited]";
    }
    if (Array.isArray(value)) {
        return value.slice(0, 100).map((entry) => sanitizePayload(entry, depth + 1));
    }
    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value)
                .filter(([key]) => !/(token|secret|password|code|credential|authorization)/i.test(key))
                .slice(0, 100)
                .map(([key, entry]) => [key, sanitizePayload(entry, depth + 1)]),
        );
    }
    if (typeof value === "string") {
        return value.slice(0, 1000);
    }
    if (typeof value === "number" || typeof value === "boolean" || value === null) {
        return value;
    }
    return String(value).slice(0, 1000);
}

async function notifyUnlockResult({ ownerId, shipperId, deliveryId, requestId, success }) {
    const recipientIds = success ? [shipperId] : [...new Set([shipperId, ownerId])];
    const result = success ? "succeeded" : "failed";
    const notificationData = recipientIds.map((userId) => ({
        userId,
        type: `delivery_unlock_${result}_${requestId}`,
        title: success ? "Vehicle unlocked" : "Vehicle unlock failed",
        message: success
            ? `The IoT device confirmed that delivery ${deliveryId} was unlocked.`
            : `The IoT device could not unlock delivery ${deliveryId}. The delivery remains incomplete.`,
        deliveryId,
    }));
    const notifications = await Notification.insertMany(notificationData, { ordered: false });
    for (const notification of notifications) {
        emitNotificationNew(notification);
    }
}

async function handleUnlockResult({ device, deviceId, topic, message, receivedAt }) {
    if (message.command !== "UNLOCK"
        || typeof message.requestId !== "string"
        || !/^[0-9a-f-]{36}$/i.test(message.requestId)
        || !mongoose.isValidObjectId(message.deliveryId)
        || typeof message.success !== "boolean") {
        throw new AppError("Unlock result payload is invalid.", 422);
    }
    if (message.lockStatus !== (message.success ? "unlocked" : "locked")) {
        throw new AppError("Unlock result lock status does not match its success value.", 422);
    }

    const { requestId, deliveryId, success } = message;
    const commandEvent = await IoTEvent.findOne({
        deviceId,
        type: { $in: ["unlock_command_requested", "unlock_command_published"] },
        "payload.requestId": requestId,
        "payload.deliveryId": deliveryId,
    });
    if (!commandEvent) {
        throw new AppError("Unlock result does not match a pending command.", 404);
    }

    const { ownerId, shipperId } = commandEvent.payload;
    const unlockStatus = success ? "succeeded" : "failed";
    const delivery = await Delivery.findOneAndUpdate(
        {
            _id: deliveryId,
            ownerId,
            shipperId,
            vehicleId: device.vehicleId,
            status: "authorized",
            unlockStatus: "pending",
        },
        { $set: { unlockStatus } },
        { new: true, runValidators: true },
    );
    if (!delivery) {
        throw new AppError("Delivery is not waiting for this unlock result.", 409);
    }

    await IoTDevice.findOneAndUpdate(
        { _id: device._id },
        {
            $set: {
                status: "online",
                lockStatus: success ? "unlocked" : "locked",
                lastSeen: receivedAt,
            },
        },
        { new: true, runValidators: true },
    );

    const errorCode = success ? null : "DEVICE_UNLOCK_FAILED";
    await IoTEvent.create({
        deviceId,
        ownerId,
        type: success ? "unlock_succeeded" : "unlock_failed",
        topic,
        payload: {
            requestId,
            deliveryId,
            command: "UNLOCK",
            success,
            ...(errorCode ? { errorCode } : {}),
            details: sanitizePayload(message.details ?? message.reason ?? null),
        },
    });
    await IoTEvent.updateOne(
        { _id: commandEvent._id },
        { $set: { type: "unlock_command_completed" } },
    );
    await notifyUnlockResult({ ownerId, shipperId, deliveryId, requestId, success });

    const eventPayload = {
        deliveryId,
        requestId,
        status: unlockStatus,
        lockStatus: success ? "unlocked" : "locked",
        ...(errorCode ? { errorCode } : {}),
    };
    emitToUser(ownerId, "iot:status", {
        deviceId,
        status: "online",
        lockStatus: eventPayload.lockStatus,
        lastSeen: receivedAt,
    });
    emitToUsers(
        success ? [shipperId] : [shipperId, ownerId],
        success ? "unlock:success" : "unlock:failed",
        eventPayload,
    );
    if (!success) {
        emitToUser(ownerId, "iot:alert", {
            deviceId,
            type: "unlock_failed",
            deliveryId,
            errorCode,
            occurredAt: receivedAt,
        });
    }

    return { delivery, unlockStatus, errorCode };
}

export async function processDeviceMessage(topic, rawMessage) {
    const topicMatch = /^lockship\/device\/([A-Za-z0-9_-]{3,100})\/(status|event|alert)$/.exec(topic);
    if (!topicMatch) {
        throw new AppError("Unsupported MQTT topic.", 400);
    }
    if (rawMessage.length > 16384) {
        throw new AppError("MQTT message exceeds the allowed size.", 413);
    }

    let message;
    try {
        message = JSON.parse(rawMessage.toString("utf8"));
    } catch {
        throw new AppError("MQTT message must contain valid JSON.", 400);
    }
    if (!message || typeof message !== "object" || Array.isArray(message)
        || typeof message.deviceToken !== "string") {
        throw new AppError("MQTT message must include a device token.", 401);
    }

    const [, deviceId, messageType] = topicMatch;
    let claims;
    try {
        claims = jwt.verify(message.deviceToken, env.MQTT_DEVICE_TOKEN_SECRET, {
            audience: deviceTokenAudience,
        });
    } catch {
        throw new AppError("MQTT device authentication failed.", 401);
    }
    if (typeof claims === "string" || claims.sub !== deviceId || claims.scope !== "iot-device") {
        throw new AppError("MQTT device authentication failed.", 401);
    }

    const device = await IoTDevice.findOne({ deviceId });
    if (!device) {
        throw new AppError("IoT device was not found.", 404);
    }
    if (!device.credentialId || claims.jti !== device.credentialId) {
        throw new AppError("MQTT device authentication failed.", 401);
    }

    const receivedAt = new Date();
    const safePayload = sanitizePayload(message);
    const eventName = String(message.event ?? message.eventType ?? "").toLowerCase();
    if (["event", "alert"].includes(messageType) && eventName === "unlock_result") {
        return handleUnlockResult({ device, deviceId, topic, message, receivedAt });
    }

    const changes = { status: "online", lastSeen: receivedAt };

    if (messageType === "status") {
        if (message.status !== undefined) {
            if (!["online", "offline"].includes(message.status)) {
                throw new AppError("Device status is invalid.", 422);
            }
            changes.status = message.status;
        }
        if (message.lockStatus !== undefined) {
            if (!["locked", "unlocked"].includes(message.lockStatus)) {
                throw new AppError("Device lock status is invalid.", 422);
            }
            changes.lockStatus = message.lockStatus;
        }
        if (message.battery !== undefined) {
            if (typeof message.battery !== "number" || message.battery < 0 || message.battery > 100) {
                throw new AppError("Device battery must be between 0 and 100.", 422);
            }
            changes.battery = message.battery;
        }
        if (message.firmwareVersion !== undefined) {
            if (typeof message.firmwareVersion !== "string" || message.firmwareVersion.length > 80) {
                throw new AppError("Firmware version is invalid.", 422);
            }
            changes.firmwareVersion = message.firmwareVersion;
        }
    }

    const updatedDevice = await IoTDevice.findOneAndUpdate(
        { _id: device._id },
        { $set: changes },
        { new: true, runValidators: true },
    );
    const isUnlockFailure = ["unlock_failed", "unlock-failed"].includes(eventName);
    await IoTEvent.create({
        deviceId,
        ownerId: device.ownerId,
        type: isUnlockFailure ? "unlock_failed" : `device_${messageType}`,
        topic,
        payload: sanitizePayload(safePayload),
    });

    if (isUnlockFailure) {
        const deliveryId = mongoose.isValidObjectId(message.deliveryId) ? message.deliveryId : null;
        await createNotification({
            userId: device.ownerId,
            type: "iot_unlock_failed",
            title: "Vehicle unlock failed",
            message: deliveryId
                ? `IoT device ${deviceId} reported an unlock failure for delivery ${deliveryId}.`
                : `IoT device ${deviceId} reported an unlock failure.`,
            deliveryId,
        });
    }

    const deviceStatusPayload = {
        deviceId,
        status: updatedDevice.status,
        lockStatus: updatedDevice.lockStatus,
        battery: updatedDevice.battery,
        lastSeen: updatedDevice.lastSeen,
        firmwareVersion: updatedDevice.firmwareVersion,
    };
    emitToUser(device.ownerId, "iot:status", deviceStatusPayload);
    if (messageType === "alert") {
        emitToUser(device.ownerId, "iot:alert", {
            deviceId,
            type: eventName || "device_alert",
            payload: safePayload,
            occurredAt: receivedAt,
        });
    }

    return updatedDevice;
}

export async function markStaleDevicesOffline() {
    const staleBefore = new Date(Date.now() - env.MQTT_OFFLINE_AFTER_SECONDS * 1000);
    const staleDevices = await IoTDevice.find({ status: "online", lastSeen: { $lt: staleBefore } });
    for (const staleDevice of staleDevices) {
        const markedOffline = await IoTDevice.findOneAndUpdate(
            { _id: staleDevice._id, status: "online", lastSeen: { $lt: staleBefore } },
            { $set: { status: "offline" } },
            { new: true },
        );
        if (markedOffline) {
            await IoTEvent.create({
                deviceId: markedOffline.deviceId,
                ownerId: markedOffline.ownerId,
                type: "device_offline",
                topic: `lockship/device/${markedOffline.deviceId}/status`,
                payload: { reason: "heartbeat_timeout", lastSeen: markedOffline.lastSeen },
            });
        }
    }
}

async function getVerifiedUnlockDevice(vehicleId, ownerId) {
    const vehicle = await Vehicle.findOne({ _id: vehicleId, ownerId, status: "active" });
    if (!vehicle) {
        throw new AppError("The delivery vehicle is unavailable.", 409, null, "DELIVERY_NOT_AUTHORIZED");
    }

    const device = await IoTDevice.findOne({ vehicleId: vehicle._id, ownerId });
    if (!device || vehicle.iotDeviceId !== device.deviceId) {
        throw new AppError("No linked IoT device is registered for this vehicle.", 503, null, "DEVICE_OFFLINE");
    }
    if (device.status !== "online" || !isMqttConnected()) {
        throw new AppError("The IoT device or MQTT broker is offline.", 503, null, "DEVICE_OFFLINE");
    }
    return device;
}

export async function assertVerifiedUnlockReady(vehicleId, ownerId) {
    return getVerifiedUnlockDevice(vehicleId, ownerId);
}

export async function publishVerifiedUnlock(vehicleId, ownerId, deliveryId) {
    const device = await getVerifiedUnlockDevice(vehicleId, ownerId);

    const delivery = await Delivery.findOne({
        _id: deliveryId,
        ownerId,
        vehicleId,
        status: "authorized",
        unlockStatus: "pending",
    });
    if (!delivery) {
        throw new AppError("Delivery is not waiting for an unlock command.", 409, null, "DELIVERY_NOT_AUTHORIZED");
    }

    const requestId = randomUUID();
    const commandEvent = await IoTEvent.create({
        deviceId: device.deviceId,
        ownerId: device.ownerId,
        type: "unlock_command_requested",
        topic: `lockship/device/${device.deviceId}/command`,
        payload: {
            command: "UNLOCK",
            requestId,
            deliveryId,
            ownerId,
            shipperId: delivery.shipperId,
        },
    });

    let result;
    try {
        result = await publishMqttCommand(device.deviceId, "UNLOCK", { requestId, deliveryId });
    } catch (error) {
        await Delivery.findOneAndUpdate(
            {
                _id: deliveryId,
                ownerId,
                shipperId: delivery.shipperId,
                status: "authorized",
                unlockStatus: "pending",
            },
            { $set: { unlockStatus: "failed" } },
            { new: true },
        );
        await IoTEvent.updateOne(
            { _id: commandEvent._id },
            { $set: { type: "unlock_command_failed", "payload.errorCode": "DEVICE_OFFLINE" } },
        );
        await IoTEvent.create({
            deviceId: device.deviceId,
            ownerId,
            type: "unlock_failed",
            topic: commandEvent.topic,
            payload: { requestId, deliveryId, command: "UNLOCK", errorCode: "DEVICE_OFFLINE" },
        });
        await notifyUnlockResult({
            ownerId,
            shipperId: delivery.shipperId,
            deliveryId,
            requestId,
            success: false,
        });
        emitToUsers([delivery.shipperId, ownerId], "unlock:failed", {
            deliveryId,
            requestId,
            status: "failed",
            errorCode: "DEVICE_OFFLINE",
        });
        throw new AppError("MQTT could not publish the unlock command.", 503, null, "DEVICE_OFFLINE");
    }

    await IoTEvent.updateOne(
        { _id: commandEvent._id, type: "unlock_command_requested" },
        { $set: { type: "unlock_command_published" } },
    );
    return result;
}