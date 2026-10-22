import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { after, before, test } from "node:test";
import jwt from "jsonwebtoken";
import { io as createSocketClient } from "socket.io-client";

process.env.JWT_SECRET = "lockship-test-secret-with-at-least-32-characters";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/lockship-test";

const { default: User } = await import("../src/models/user.model.js");
const { default: Delivery } = await import("../src/models/delivery.model.js");
const { default: BoxAccessRequest } = await import("../src/models/box-access-request.model.js");
const { default: RevokedToken } = await import("../src/models/revoked-token.model.js");
const { closeSocket, initializeSocket } = await import("../src/services/socket.service.js");
const { default: app } = await import("../src/app.js");

let server;
let baseUrl;
const ownerId = "507f1f77bcf86cd799439011";

function makeToken(userId, role = "owner") {
    return jwt.sign({ ver: 0, role }, process.env.JWT_SECRET, { subject: userId, expiresIn: "1h" });
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
    server = createServer(app);
    initializeSocket(server);
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
    await closeSocket();
    if (server?.listening) {
        server.close();
        server.closeAllConnections();
        await once(server, "close");
    }
});

test("GET /api/public/boxes/:boxId/info returns locker metadata without authentication", async () => {
    const res = await fetch(`${baseUrl}/api/public/boxes/box-04/info`);
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.box.boxId, "box-04");
    assert.ok(body.data.box.name.includes("Box #04"));
});

test("POST /api/public/boxes/:boxId/request-access validates phone and creates PENDING request", async () => {
    // 1. Invalid phone
    const badRes = await fetch(`${baseUrl}/api/public/boxes/box-04/request-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shipperPhone: "123" }),
    });
    assert.equal(badRes.status, 422);

    // Mock models
    const origUserFindOne = User.findOne;
    const origUserFindById = User.findById;
    const origReqCreate = BoxAccessRequest.create;
    const { default: IoTDevice } = await import("../src/models/iot-device.model.js");
    const { default: Notification } = await import("../src/models/notification.model.js");
    const origIotFindOne = IoTDevice.findOne;
    const origDeliveryFindOne = Delivery.findOne;
    const origNotifCreate = Notification.create;

    let createdPayload = null;
    IoTDevice.findOne = async () => null;
    Delivery.findOne = async () => null;
    User.findOne = async () => ({ _id: ownerId, role: "owner", status: "active", email: "owner@lockship.vn" });
    User.findById = () => ({
        select: async () => ({ _id: ownerId, email: "owner@lockship.vn" }),
    });
    Notification.create = async () => ({ _id: "notif1" });
    BoxAccessRequest.create = async (doc) => {
        createdPayload = { ...doc, _id: "67890f77bcf86cd799439099", createdAt: new Date() };
        return createdPayload;
    };

    try {
        const res = await fetch(`${baseUrl}/api/public/boxes/box-04/request-access`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                shipperName: "Nguyen Van Shipper",
                shipperPhone: "0901234567",
                deliverySource: "Shopee Express",
                packageDescription: "Áo khoác gió",
            }),
        });
        const body = await res.json();

        assert.equal(res.status, 201);
        assert.equal(body.success, true);
        assert.equal(body.data.request.status, "PENDING");
        assert.equal(body.data.request.boxId, "box-04");
        assert.ok(body.data.guestToken);

        // Verify guest socket can connect with guestToken
        const guestSocket = await connectClient(body.data.guestToken);
        assert.ok(guestSocket.connected);

        guestSocket.disconnect();
    } finally {
        User.findOne = origUserFindOne;
        User.findById = origUserFindById;
        BoxAccessRequest.create = origReqCreate;
        IoTDevice.findOne = origIotFindOne;
        Delivery.findOne = origDeliveryFindOne;
        Notification.create = origNotifCreate;
    }
});

test("Owner can list and respond to access requests, emitting real-time PIN code to guest shipper", async () => {
    const origReqFind = BoxAccessRequest.find;
    const origReqFindOne = BoxAccessRequest.findOne;
    const origDeliveryFind = Delivery.find;
    const origDeliveryFindOne = Delivery.findOne;
    const origUserFindById = User.findById;
    const origRevoked = RevokedToken.exists;

    const mockRequest = {
        _id: "67890f77bcf86cd799439099",
        boxId: "box-04",
        ownerId,
        shipperName: "Nguyen Van Shipper",
        shipperPhone: "0901234567",
        deliverySource: "Shopee Express",
        status: "PENDING",
        orderId: null,
        unlockCode: null,
        createdAt: new Date(),
        save: async function () { return this; },
    };

    const mockDelivery = {
        _id: "507f1f77bcf86cd799439088",
        ownerId,
        boxId: "box-04",
        pickupAddress: "Shop A",
        deliveryAddress: "Box 04",
        status: "assigned",
        save: async function () { return this; },
    };

    User.findById = (id) => ({
        select: async () => ({ id: ownerId, role: "owner", status: "active", tokenVersion: 0 }),
    });
    RevokedToken.exists = async () => null;

    BoxAccessRequest.find = () => ({
        populate: () => ({
            sort: () => ({
                limit: async () => [mockRequest],
            }),
        }),
    });
    Delivery.find = () => ({
        select: () => ({
            sort: async () => [mockDelivery],
        }),
    });
    BoxAccessRequest.findOne = async () => mockRequest;
    Delivery.findOne = async () => mockDelivery;

    try {
        const ownerToken = makeToken(ownerId, "owner");

        // 1. List requests
        const listRes = await fetch(`${baseUrl}/api/owner/access-requests`, {
            headers: { Authorization: `Bearer ${ownerToken}` },
        });
        const listBody = await listRes.json();
        assert.equal(listRes.status, 200);
        assert.equal(listBody.data.requests.length, 1);
        assert.equal(listBody.data.candidateDeliveries.length, 1);

        // 2. Connect guest socket
        const guestToken = jwt.sign(
            {
                sub: `guest_${mockRequest._id}`,
                purpose: "guest-box-access",
                requestId: mockRequest._id,
                boxId: "box-04",
            },
            process.env.JWT_SECRET,
            { expiresIn: "1h" },
        );
        const guestSocket = await connectClient(guestToken);

        const approvalPromise = new Promise((resolve) => {
            guestSocket.on("request_approved", (payload) => resolve(payload));
        });

        // 3. Owner approves request
        const respondRes = await fetch(`${baseUrl}/api/owner/access-requests/${mockRequest._id}/respond`, {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${ownerToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                action: "APPROVE",
                orderId: mockDelivery._id,
                notes: "Chấp nhận giao hàng",
            }),
        });
        const respondBody = await respondRes.json();

        assert.equal(respondRes.status, 200);
        assert.equal(respondBody.data.request.status, "APPROVED");
        assert.ok(respondBody.data.unlockCode);
        assert.equal(respondBody.data.unlockCode.length, 6);

        // 4. Verify guest socket received the event with the PIN code
        const received = await approvalPromise;
        assert.equal(received.status, "APPROVED");
        assert.equal(received.unlockCode, respondBody.data.unlockCode);
        assert.equal(received.boxId, "box-04");

        guestSocket.disconnect();
    } finally {
        BoxAccessRequest.find = origReqFind;
        BoxAccessRequest.findOne = origReqFindOne;
        Delivery.find = origDeliveryFind;
        Delivery.findOne = origDeliveryFindOne;
        User.findById = origUserFindById;
        RevokedToken.exists = origRevoked;
    }
});
