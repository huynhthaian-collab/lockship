import dotenv from "dotenv";

dotenv.config();

function required(name) {
    const value = process.env[name]?.trim();
    if (!value) {
        throw new Error(`${name} is required.`);
    }
    return value;
}

function booleanValue(name, fallback = false) {
    const value = process.env[name];
    if (value === undefined) {
        return fallback;
    }
    if (!["true", "false"].includes(value.toLowerCase())) {
        throw new Error(`${name} must be true or false.`);
    }
    return value.toLowerCase() === "true";
}

function boundedNumber(name, fallback, min, max) {
    const value = Number(process.env[name] ?? fallback);
    if (!Number.isFinite(value) || value < min || value > max) {
        throw new Error(`${name} must be between ${min} and ${max}.`);
    }
    return value;
}

export function loadConfig() {
    const deviceId = required("DEVICE_ID");
    if (!/^[A-Za-z0-9_-]{3,100}$/.test(deviceId)) {
        throw new Error("DEVICE_ID must be 3 to 100 letters, numbers, underscores, or hyphens.");
    }

    const brokerUrl = required("MQTT_BROKER_URL");
    const parsedBrokerUrl = new URL(brokerUrl);
    if (!["mqtt:", "mqtts:"].includes(parsedBrokerUrl.protocol)) {
        throw new Error("MQTT_BROKER_URL must use mqtt:// or mqtts://.");
    }

    const failureRate = boundedNumber("UNLOCK_FAILURE_RATE", 0, 0, 1);
    const statusIntervalMs = boundedNumber("STATUS_INTERVAL_MS", 30000, 1000, 3600000);
    const unlockDelayMs = boundedNumber("UNLOCK_DELAY_MS", 250, 0, 30000);
    const batteryLevel = boundedNumber("BATTERY_LEVEL", 100, 0, 100);

    return Object.freeze({
        deviceId,
        deviceToken: required("DEVICE_TOKEN"),
        brokerUrl,
        username: required("MQTT_USERNAME"),
        password: required("MQTT_PASSWORD"),
        simulateUnlockFailure: booleanValue("SIMULATE_UNLOCK_FAILURE"),
        unlockFailureRate: failureRate,
        statusIntervalMs,
        unlockDelayMs,
        firmwareVersion: process.env.FIRMWARE_VERSION?.trim() || "sim-1.0.0",
        batteryLevel,
    });
}