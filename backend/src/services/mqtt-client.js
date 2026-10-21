import AppError from "../utils/app-error.js";

let mqttClient = null;

export function setMqttClient(client) {
    mqttClient = client;
}

export function isMqttConnected() {
    return Boolean(mqttClient?.connected);
}

export function publishMqttCommand(deviceId, command, payload = {}) {
    if (!mqttClient?.connected) {
        throw new AppError("MQTT broker is not connected.", 503);
    }

    const topic = `lockship/device/${deviceId}/command`;
    const message = JSON.stringify({
        command,
        requestId: payload.requestId,
        deliveryId: payload.deliveryId,
        issuedAt: new Date().toISOString(),
    });

    return new Promise((resolve, reject) => {
        mqttClient.publish(topic, message, { qos: 1, retain: false }, (error) => {
            if (error) {
                reject(new AppError("Failed to publish MQTT command.", 503, null, "DEVICE_OFFLINE"));
                return;
            }
            resolve({ topic, command, requestId: payload.requestId });
        });
    });
}