import assert from "node:assert/strict";
import { once } from "node:events";
import { after, before, test } from "node:test";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET = "lockship-test-secret-with-at-least-32-characters";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/lockship-test";

const { default: Delivery } = await import("../src/models/delivery.model.js");
const { default: Notification } = await import("../src/models/notification.model.js");
const { default: User } = await import("../src/models/user.model.js");
const { default: RevokedToken } = await import("../src/models/revoked-token.model.js");
const deliveryService = await import("../src/services/delivery.service.js");
const notificationService = await import("../src/services/notification.service.js");
const { default: app } = await import("../src/app.js");
let server;
let baseUrl;

before(async () => {
    server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
    if (server?.listening) {
        server.close();
        server.closeAllConnections();
        await once(server, "close");
    }
});

test("notifications API is mounted and requires authentication", async () => {
    const response = await fetch(`${baseUrl}/api/notifications`);
    assert.equal(response.status, 401);
});

test("arriving delivery creates one owner notification with delivery details", async () => {
    const originalTransition = Delivery.findOneAndUpdate;
    const originalNotificationUpsert = Notification.findOneAndUpdate;
    const ownerId = "507f1f77bcf86cd799439011";
    const shipperId = "507f1f77bcf86cd799439012";
    const deliveryId = "507f1f77bcf86cd799439013";
    const arrivedDelivery = {
        _id: deliveryId,
        ownerId,
        shipperId,
        pickupAddress: "North warehouse",
        deliveryAddress: "12 Main Street",
        status: "arrived",
    };
    let transitionFilter;
    let notificationFilter;
    let notificationUpdate;

    Delivery.findOneAndUpdate = async (filter) => {
        transitionFilter = filter;
        return arrivedDelivery;
    };
    Notification.findOneAndUpdate = async (filter, update) => {
        notificationFilter = filter;
        notificationUpdate = update;
        return { ...filter, ...update.$setOnInsert };
    };

    try {
        await deliveryService.arriveAtDestination(shipperId, deliveryId);

        assert.deepEqual(transitionFilter, {
            _id: deliveryId,
            shipperId,
            status: { $in: ["in-progress"] },
        });
        assert.deepEqual(notificationFilter, {
            userId: ownerId,
            type: "delivery_arrived",
            deliveryId,
        });
        assert.match(notificationUpdate.$setOnInsert.message, /North warehouse/);
        assert.match(notificationUpdate.$setOnInsert.message, /12 Main Street/);
    } finally {
        Delivery.findOneAndUpdate = originalTransition;
        Notification.findOneAndUpdate = originalNotificationUpsert;
    }
});

test("notification list query is scoped to the current user", async () => {
    const originalFind = Notification.find;
    const userId = "507f1f77bcf86cd799439011";
    let receivedFilter;

    Notification.find = (filter) => ({
        sort(sortOrder) {
            receivedFilter = filter;
            assert.deepEqual(sortOrder, { createdAt: -1 });
            return [];
        },
    });

    try {
        assert.deepEqual(await notificationService.listUserNotifications(userId), []);
        assert.deepEqual(receivedFilter, { userId });
    } finally {
        Notification.find = originalFind;
    }
});

test("marking a notification read cannot affect another user's record", async () => {
    const originalFindOneAndUpdate = Notification.findOneAndUpdate;
    const userId = "507f1f77bcf86cd799439011";
    const notificationId = "507f1f77bcf86cd799439014";
    let receivedFilter;

    Notification.findOneAndUpdate = async (filter) => {
        receivedFilter = filter;
        return null;
    };

    try {
        await assert.rejects(
            notificationService.markNotificationRead(userId, notificationId),
            (error) => error.statusCode === 404,
        );
        assert.deepEqual(receivedFilter, { _id: notificationId, userId });
    } finally {
        Notification.findOneAndUpdate = originalFindOneAndUpdate;
    }
});

test("mark all read only updates unread notifications for that user", async () => {
    const originalUpdateMany = Notification.updateMany;
    const userId = "507f1f77bcf86cd799439011";
    let receivedFilter;
    let receivedUpdate;

    Notification.updateMany = async (filter, update) => {
        receivedFilter = filter;
        receivedUpdate = update;
        return { modifiedCount: 3 };
    };

    try {
        assert.deepEqual(await notificationService.markAllNotificationsRead(userId), { modifiedCount: 3 });
        assert.deepEqual(receivedFilter, { userId, isRead: false });
        assert.deepEqual(receivedUpdate, { $set: { isRead: true } });
    } finally {
        Notification.updateMany = originalUpdateMany;
    }
});

test("notification read API validates IDs before persistence", async () => {
    const originalExists = RevokedToken.exists;
    const originalFindById = User.findById;
    const userId = "507f1f77bcf86cd799439011";
    const token = jwt.sign({ ver: 0 }, process.env.JWT_SECRET, { subject: userId, expiresIn: "1h" });

    RevokedToken.exists = async () => null;
    User.findById = () => ({
        select: async () => ({ id: userId, role: "owner", status: "active", tokenVersion: 0 }),
    });

    try {
        const response = await fetch(`${baseUrl}/api/notifications/not-an-id/read`, {
            method: "PUT",
            headers: { authorization: `Bearer ${token}` },
        });
        const body = await response.json();

        assert.equal(response.status, 422);
        assert.equal(body.success, false);
    } finally {
        RevokedToken.exists = originalExists;
        User.findById = originalFindById;
    }
});