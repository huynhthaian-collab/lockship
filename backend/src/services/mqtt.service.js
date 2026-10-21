import mqtt from "mqtt";
import { env } from "../config/env.js";
import { processDeviceMessage, markStaleDevicesOffline } from "./iot-device.service.js";
import { setMqttClient } from "./mqtt-client.js";

let client = null;
let offlineMonitor = null;

const inboundTopics = [
    "lockship/device/+/status",
    "lockship/device/+/event",
    "lockship/device/+/alert",
];

export function startMqtt(connect = mqtt.connect) {
    if (!offlineMonitor) {
        offlineMonitor = setInterval(() => {
            markStaleDevicesOffline().catch((error) => {
                console.error("Failed to mark stale IoT devices offline.", error.message);
            });
        }, Math.max(5000, Math.floor(env.MQTT_OFFLINE_AFTER_SECONDS * 500)));
        offlineMonitor.unref();
    }

    if (!env.MQTT_URL) {
        console.warn("MQTT_URL is not configured; IoT telemetry and commands are unavailable.");
        return null;
    }
    if (client) {
        return client;
    }

    client = connect(env.MQTT_URL, {
        username: env.MQTT_USERNAME,
        password: env.MQTT_PASSWORD,
        clientId: env.MQTT_CLIENT_ID,
        clean: true,
        connectTimeout: 10000,
        reconnectPeriod: 5000,
        rejectUnauthorized: true,
    });
    setMqttClient(client);

    client.on("connect", () => {
        console.info("Connected to MQTT broker.");
        client.subscribe(inboundTopics, { qos: 1 }, (error) => {
            if (error) {
                console.error("Failed to subscribe to MQTT device topics.", error.message);
            }
        });
    });

    client.on("reconnect", () => console.info("Reconnecting to MQTT broker."));
    client.on("offline", () => console.warn("MQTT connection is offline."));
    client.on("error", (error) => console.error("MQTT connection error.", error.message));
    client.on("message", (topic, payload) => {
        processDeviceMessage(topic, payload).catch((error) => {
            console.warn("Rejected MQTT device message.", { topic, message: error.message });
        });
    });

    return client;
}

export async function stopMqtt() {
    if (offlineMonitor) {
        clearInterval(offlineMonitor);
        offlineMonitor = null;
    }
    if (!client) {
        return;
    }

    const activeClient = client;
    client = null;
    setMqttClient(null);
    await new Promise((resolve) => activeClient.end(false, {}, resolve));
}