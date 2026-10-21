import { createServer } from "node:http";
import mongoose from "mongoose";
import app from "./app.js";
import { connectDatabase } from "./config/database.js";
import { env } from "./config/env.js";
import { startMqtt, stopMqtt } from "./services/mqtt.service.js";
import { closeSocket, initializeSocket } from "./services/socket.service.js";

async function startServer() {
    await connectDatabase();
    startMqtt();
    const server = createServer(app);
    const socketServer = initializeSocket(server);
    server.listen(env.PORT, () => {
        console.info(`LOCKSHIP API listening on port ${env.PORT}.`);
    });

    let isShuttingDown = false;
    const shutdown = (signal) => {
        if (isShuttingDown) {
            return;
        }
        isShuttingDown = true;
        console.info(`${signal} received; shutting down.`);

        void (async () => {
            try {
                await stopMqtt();
                await closeSocket();
                await mongoose.disconnect();
                process.exitCode = 0;
            } catch (shutdownError) {
                console.error(shutdownError);
                process.exitCode = 1;
                socketServer.close();
            }
        })();
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
}

startServer().catch((error) => {
    console.error("Failed to start LOCKSHIP API.", error);
    process.exitCode = 1;
});