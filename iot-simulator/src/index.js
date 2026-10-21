import mqtt from "mqtt";
import { loadConfig } from "./config.js";
import { createSimulator } from "./simulator.js";

function createLastWill(config) {
    return {
        topic: `lockship/device/${config.deviceId}/status`,
        payload: JSON.stringify({
            deviceToken: config.deviceToken,
            status: "offline",
            battery: config.batteryLevel,
            firmwareVersion: config.firmwareVersion,
        }),
        qos: 1,
        retain: true,
    };
}

async function main() {
    const config = loadConfig();
    const client = mqtt.connect(config.brokerUrl, {
        username: config.username,
        password: config.password,
        clientId: `lockship-simulator-${config.deviceId}`,
        clean: true,
        connectTimeout: 10000,
        reconnectPeriod: 3000,
        rejectUnauthorized: true,
        will: createLastWill(config),
    });
    const simulator = createSimulator({ config, client });

    simulator.start();
    console.info(`[${config.deviceId}] LOCKSHIP MQTT simulator started.`);

    let stopping = false;
    const shutdown = (signal) => {
        if (stopping) {
            return;
        }
        stopping = true;
        console.info(`[${config.deviceId}] ${signal} received; publishing offline status.`);
        simulator.stop().catch((error) => {
            console.error(`[${config.deviceId}] shutdown failed: ${error.message}`);
            process.exitCode = 1;
        });
    };

    process.once("SIGINT", () => shutdown("SIGINT"));
    process.once("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((error) => {
    console.error(`IoT simulator failed to start: ${error.message}`);
    process.exitCode = 1;
});