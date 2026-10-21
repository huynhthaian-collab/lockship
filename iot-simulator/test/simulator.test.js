import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { test } from "node:test";
import { createSimulator } from "../src/simulator.js";

function createFakeClient() {
    const client = new EventEmitter();
    client.connected = true;
    client.published = [];
    client.subscriptions = [];
    client.subscribe = (topic, options, callback) => {
        client.subscriptions.push({ topic, options });
        callback(null, []);
    };
    client.publish = (topic, payload, options, callback) => {
        client.published.push({ topic, message: JSON.parse(payload), options });
        callback(null);
    };
    client.end = (_force, _options, callback) => {
        client.connected = false;
        callback();
    };
    return client;
}

function config(overrides = {}) {
    return {
        deviceId: "lockship-device-001",
        deviceToken: "signed-device-token",
        simulateUnlockFailure: false,
        unlockFailureRate: 0,
        statusIntervalMs: 3600000,
        unlockDelayMs: 0,
        firmwareVersion: "sim-1.0.0",
        batteryLevel: 95,
        ...overrides,
    };
}

const validRequestId = "11111111-1111-4111-8111-111111111111";
const validDeliveryId = "507f1f77bcf86cd799439013";

test("subscribes to its command topic and publishes online status", async () => {
    const client = createFakeClient();
    const simulator = createSimulator({ config: config(), client, logger: { info() { }, warn() { }, error() { } } });
    simulator.start();
    client.emit("connect");

    assert.deepEqual(client.subscriptions, [{
        topic: "lockship/device/lockship-device-001/command",
        options: { qos: 1 },
    }]);
    assert.equal(client.published[0].topic, "lockship/device/lockship-device-001/status");
    assert.equal(client.published[0].message.status, "online");
    assert.equal(client.published[0].message.deviceToken, "signed-device-token");
    await simulator.stop();
});

test("LOCK, STATUS, and PING commands publish status", async () => {
    const client = createFakeClient();
    const simulator = createSimulator({ config: config(), client, logger: { info() { }, warn() { }, error() { } } });

    for (const command of ["LOCK", "STATUS", "PING"]) {
        await simulator.handleCommand(simulator.commandTopic, Buffer.from(JSON.stringify({ command, requestId: validRequestId })));
    }

    assert.equal(simulator.lockStatus, "locked");
    assert.equal(client.published.length, 3);
    assert.ok(client.published.every(({ topic, message }) => topic.endsWith("/status") && message.status === "online"));
});

test("UNLOCK success publishes a correlated successful event without a code", async () => {
    const client = createFakeClient();
    const simulator = createSimulator({ config: config(), client, logger: { info() { }, warn() { }, error() { } } });

    await simulator.handleCommand(simulator.commandTopic, Buffer.from(JSON.stringify({
        command: "UNLOCK",
        requestId: validRequestId,
        deliveryId: validDeliveryId,
        issuedAt: new Date().toISOString(),
    })));

    const result = client.published.find(({ topic }) => topic.endsWith("/event"));
    assert.equal(simulator.lockStatus, "unlocked");
    assert.equal(result.message.event, "unlock_result");
    assert.equal(result.message.requestId, validRequestId);
    assert.equal(result.message.deliveryId, validDeliveryId);
    assert.equal(result.message.success, true);
    assert.equal(result.message.lockStatus, "unlocked");
    assert.equal(Object.hasOwn(result.message, "code"), false);
});

test("configured unlock failure reports locked state and unsuccessful result", async () => {
    const client = createFakeClient();
    const simulator = createSimulator({
        config: config({ simulateUnlockFailure: true }),
        client,
        logger: { info() { }, warn() { }, error() { } },
    });

    await simulator.handleCommand(simulator.commandTopic, Buffer.from(JSON.stringify({
        command: "UNLOCK",
        requestId: validRequestId,
        deliveryId: validDeliveryId,
    })));

    const result = client.published.find(({ topic }) => topic.endsWith("/event"));
    assert.equal(simulator.lockStatus, "locked");
    assert.equal(result.message.success, false);
    assert.equal(result.message.lockStatus, "locked");
    assert.equal(result.message.details, "simulated_unlock_failure");
});

test("invalid or unauthorized commands publish a sanitized alert", async () => {
    const client = createFakeClient();
    const simulator = createSimulator({ config: config(), client, logger: { info() { }, warn() { }, error() { } } });

    await simulator.handleCommand(simulator.commandTopic, Buffer.from(JSON.stringify({
        command: "UNLOCK",
        requestId: validRequestId,
        deliveryId: validDeliveryId,
        code: "plain-unlock-code",
    })));

    const alert = client.published.find(({ topic }) => topic.endsWith("/alert"));
    assert.equal(alert.message.event, "unauthorized_access");
    assert.equal(alert.message.reason, "sensitive_command_field");
    assert.equal(JSON.stringify(alert.message).includes("plain-unlock-code"), false);
});

test("missing request correlation is rejected without executing a command", async () => {
    const client = createFakeClient();
    const simulator = createSimulator({ config: config(), client, logger: { info() { }, warn() { }, error() { } } });

    await simulator.handleCommand(simulator.commandTopic, Buffer.from(JSON.stringify({ command: "LOCK" })));

    assert.equal(simulator.lockStatus, "locked");
    assert.equal(client.published.length, 1);
    assert.equal(client.published[0].topic.endsWith("/alert"), true);
    assert.equal(client.published[0].message.reason, "missing_or_invalid_request_id");
});

test("graceful stop publishes offline status", async () => {
    const client = createFakeClient();
    const simulator = createSimulator({ config: config(), client, logger: { info() { }, warn() { }, error() { } } });

    await simulator.stop();

    assert.equal(client.published.length, 1);
    assert.equal(client.published[0].message.status, "offline");
    assert.equal(client.connected, false);
});