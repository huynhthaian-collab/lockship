import { randomUUID } from "node:crypto";

const validCommands = new Set(["LOCK", "UNLOCK", "STATUS", "PING"]);
const requestIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const objectIdPattern = /^[0-9a-f]{24}$/i;

export function createSimulator({ config, client, random = Math.random, logger = console }) {
    const baseTopic = `lockship/device/${config.deviceId}`;
    const commandTopic = `${baseTopic}/command`;
    let lockStatus = "locked";
    let statusTimer = null;
    let started = false;

    function publish(topic, message, { retain = false } = {}) {
        if (!client.connected) {
            return Promise.reject(new Error("MQTT broker is not connected."));
        }

        return new Promise((resolve, reject) => {
            client.publish(topic, JSON.stringify(message), { qos: 1, retain }, (error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        });
    }

    async function publishStatus(status = "online") {
        return publish(`${baseTopic}/status`, {
            deviceToken: config.deviceToken,
            status,
            lockStatus,
            battery: config.batteryLevel,
            firmwareVersion: config.firmwareVersion,
        }, { retain: true });
    }

    async function publishUnauthorizedAlert(reason) {
        await publish(`${baseTopic}/alert`, {
            deviceToken: config.deviceToken,
            event: "unauthorized_access",
            deviceId: config.deviceId,
            reason,
            occurredAt: new Date().toISOString(),
        });
        logger.warn(`[${config.deviceId}] rejected an unauthorized command (${reason}).`);
    }

    function hasSensitiveCommandField(message) {
        return Object.keys(message).some((field) => /^(code|unlockCode|passcode|deviceToken|password|secret)$/i.test(field));
    }

    async function handleCommand(topic, rawPayload) {
        if (topic !== commandTopic) {
            await publishUnauthorizedAlert("wrong_command_topic");
            return;
        }

        let message;
        try {
            message = JSON.parse(rawPayload.toString("utf8"));
        } catch {
            await publishUnauthorizedAlert("invalid_json");
            return;
        }

        if (!message || typeof message !== "object" || Array.isArray(message)) {
            await publishUnauthorizedAlert("invalid_command_payload");
            return;
        }
        if (hasSensitiveCommandField(message)) {
            await publishUnauthorizedAlert("sensitive_command_field");
            return;
        }

        const allowedFields = ["command", "requestId", "deliveryId", "issuedAt"];
        if (Object.keys(message).some((field) => !allowedFields.includes(field))) {
            await publishUnauthorizedAlert("unsupported_command_fields");
            return;
        }

        const command = typeof message.command === "string" ? message.command.toUpperCase() : "";
        if (!validCommands.has(command)) {
            await publishUnauthorizedAlert("unsupported_command");
            return;
        }
        if (typeof message.requestId !== "string" || !requestIdPattern.test(message.requestId)) {
            await publishUnauthorizedAlert("missing_or_invalid_request_id");
            return;
        }
        if (command === "UNLOCK" && (typeof message.deliveryId !== "string" || !objectIdPattern.test(message.deliveryId))) {
            await publishUnauthorizedAlert("unlock_missing_delivery_id");
            return;
        }

        if (command === "LOCK") {
            lockStatus = "locked";
            await publishStatus();
            logger.info(`[${config.deviceId}] lock command completed (${message.requestId}).`);
            return;
        }

        if (command === "STATUS" || command === "PING") {
            await publishStatus();
            logger.info(`[${config.deviceId}] ${command} command completed (${message.requestId}).`);
            return;
        }

        await new Promise((resolve) => setTimeout(resolve, config.unlockDelayMs));
        const success = !config.simulateUnlockFailure && random() >= config.unlockFailureRate;
        lockStatus = success ? "unlocked" : "locked";
        await publishStatus();
        await publish(`${baseTopic}/event`, {
            deviceToken: config.deviceToken,
            event: "unlock_result",
            command: "UNLOCK",
            requestId: message.requestId,
            deliveryId: message.deliveryId,
            success,
            lockStatus,
            ...(!success ? { details: "simulated_unlock_failure" } : {}),
        });
        logger.info(`[${config.deviceId}] UNLOCK ${success ? "succeeded" : "failed"} (${message.requestId}).`);
    }

    function start() {
        if (started) {
            return;
        }
        started = true;
        client.on("connect", () => {
            client.subscribe(commandTopic, { qos: 1 }, (error) => {
                if (error) {
                    logger.error(`[${config.deviceId}] command subscription failed: ${error.message}`);
                    return;
                }
                logger.info(`[${config.deviceId}] subscribed to ${commandTopic}.`);
                publishStatus().catch((publishError) => {
                    logger.error(`[${config.deviceId}] online status publish failed: ${publishError.message}`);
                });
            });
        });
        client.on("message", (topic, payload) => {
            handleCommand(topic, payload).catch((error) => {
                logger.error(`[${config.deviceId}] command handling failed: ${error.message}`);
            });
        });
        client.on("offline", () => logger.warn(`[${config.deviceId}] MQTT connection lost; Last Will will report offline.`));
        client.on("error", (error) => logger.error(`[${config.deviceId}] MQTT client error: ${error.message}`));

        statusTimer = setInterval(() => {
            publishStatus().catch((error) => {
                logger.error(`[${config.deviceId}] status publish failed: ${error.message}`);
            });
        }, config.statusIntervalMs);
        statusTimer.unref();
    }

    async function stop() {
        if (statusTimer) {
            clearInterval(statusTimer);
            statusTimer = null;
        }

        if (client.connected) {
            try {
                await publishStatus("offline");
            } catch (error) {
                logger.error(`[${config.deviceId}] offline status publish failed: ${error.message}`);
            }
        }

        await new Promise((resolve) => client.end(false, {}, resolve));
    }

    return {
        start,
        stop,
        handleCommand,
        publishStatus,
        get lockStatus() {
            return lockStatus;
        },
        commandTopic,
        statusTopic: `${baseTopic}/status`,
        eventTopic: `${baseTopic}/event`,
        alertTopic: `${baseTopic}/alert`,
        createRequestId: randomUUID,
    };
}