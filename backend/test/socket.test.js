import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { after, before, test } from "node:test";
import jwt from "jsonwebtoken";
import { io as createSocketClient } from "socket.io-client";

process.env.JWT_SECRET = "lockship-test-secret-with-at-least-32-characters";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/lockship-test";

const { default: User } = await import("../src/models/user.model.js");
const { default: RevokedToken } = await import("../src/models/revoked-token.model.js");
const {
    closeSocket,
    disconnectUserSockets,
    disconnectUserToken,
    emitToUser,
    initializeSocket,
} = await import("../src/services/socket.service.js");
const { default: app } = await import("../src/app.js");
let server;
let baseUrl;
let originalUserFindById;
let originalRevokedExists;

const users = new Map([
    ["507f1f77bcf86cd799439011", { id: "507f1f77bcf86cd799439011", role: "owner", status: "active", tokenVersion: 0 }],
    ["507f1f77bcf86cd799439012", { id: "507f1f77bcf86cd799439012", role: "shipper", status: "active", tokenVersion: 0 }],
]);

function makeToken(userId, expiresIn = "1h") {
    return jwt.sign({ ver: 0 }, process.env.JWT_SECRET, { subject: userId, expiresIn });
}

function connectClient(token) {
    return new Promise((resolve, reject) => {
        const client = createSocketClient(baseUrl, {
            ...(token ? { auth: { token } } : {}),
            transports: ["websocket"],
            reconnection: false,
            timeout: 2000,
        });
        client.once("connect", () => resolve(client));
        client.once("connect_error", (error) => {
            client.close();
            reject(error);
        });
    });
}

before(async () => {
    originalUserFindById = User.findById;
    originalRevokedExists = RevokedToken.exists;
    User.findById = (userId) => ({
        select: async () => users.get(userId.toString()) ?? null,
    });
    RevokedToken.exists = async () => null;

    server = createServer(app);
    initializeSocket(server);
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
    await closeSocket();
    User.findById = originalUserFindById;
    RevokedToken.exists = originalRevokedExists;
});

test("Socket.IO rejects clients without a valid JWT", async () => {
    await assert.rejects(
        connectClient(null),
        (error) => error.message === "Authentication required.",
    );
});

test("Socket.IO delivers user events only to that user's room and strips secrets", async () => {
    const ownerId = "507f1f77bcf86cd799439011";
    const shipperId = "507f1f77bcf86cd799439012";
    const ownerSocket = await connectClient(makeToken(ownerId));
    const shipperSocket = await connectClient(makeToken(shipperId));
    let shipperReceivedOwnerEvent = false;
    shipperSocket.on("delivery:arrived", () => {
        shipperReceivedOwnerEvent = true;
    });

    try {
        const ownerEvent = new Promise((resolve) => ownerSocket.once("delivery:arrived", resolve));
        emitToUser(ownerId, "delivery:arrived", {
            deliveryId: "507f1f77bcf86cd799439013",
            pickupAddress: "Warehouse A",
            deliveryAddress: "15 Main Street",
            code: "482901",
            unlockCode: "482901",
            deviceToken: "device-jwt-secret",
            errorCode: "DEVICE_OFFLINE",
            unlockExpiresAt: "2026-10-02T10:00:00.000Z",
            nested: { accessToken: "hidden", status: "arrived" },
        });

        const payload = await ownerEvent;
        await new Promise((resolve) => setTimeout(resolve, 40));

        assert.equal(payload.deliveryId, "507f1f77bcf86cd799439013");
        assert.equal(payload.pickupAddress, "Warehouse A");
        assert.equal(Object.hasOwn(payload, "unlockCode"), false);
        assert.equal(Object.hasOwn(payload, "code"), false);
        assert.equal(Object.hasOwn(payload, "deviceToken"), false);
        assert.equal(payload.errorCode, "DEVICE_OFFLINE");
        assert.equal(payload.unlockExpiresAt, "2026-10-02T10:00:00.000Z");
        assert.equal(payload.nested.accessToken, undefined);
        assert.equal(payload.nested.status, "arrived");
        assert.equal(shipperReceivedOwnerEvent, false);
    } finally {
        ownerSocket.disconnect();
        shipperSocket.disconnect();
    }
});

test("revoked JWTs cannot establish realtime sessions", async () => {
    const token = makeToken("507f1f77bcf86cd799439011");
    RevokedToken.exists = async () => ({ _id: "revoked" });

    try {
        await assert.rejects(
            connectClient(token),
            (error) => error.message === "Authentication token has been revoked.",
        );
    } finally {
        RevokedToken.exists = async () => null;
    }
});

test("connected sockets are disconnected when their JWT is revoked", async () => {
    const token = makeToken("507f1f77bcf86cd799439011");
    const client = await connectClient(token);

    try {
        const disconnected = once(client, "disconnect");
        disconnectUserToken(token);
        await disconnected;
    } finally {
        client.close();
    }
});

test("connected sockets are disconnected when the user's tokens are invalidated", async () => {
    const userId = "507f1f77bcf86cd799439012";
    const client = await connectClient(makeToken(userId));

    try {
        const disconnected = once(client, "disconnect");
        disconnectUserSockets(userId);
        await disconnected;
    } finally {
        client.close();
    }
});

test("connected sockets are disconnected when their JWT expires", async () => {
    const client = await connectClient(makeToken("507f1f77bcf86cd799439011", "1s"));

    try {
        await once(client, "disconnect");
    } finally {
        client.close();
    }
});
