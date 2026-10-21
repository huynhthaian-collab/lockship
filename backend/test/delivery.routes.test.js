import assert from "node:assert/strict";
import { once } from "node:events";
import { after, before, test } from "node:test";
import jwt from "jsonwebtoken";
import AppError from "../src/utils/app-error.js";
import { authorizeRoles } from "../src/middleware/authorize.middleware.js";

process.env.JWT_SECRET = "lockship-test-secret-with-at-least-32-characters";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/lockship-test";

const { default: Delivery } = await import("../src/models/delivery.model.js");
const { default: User } = await import("../src/models/user.model.js");
const { default: RevokedToken } = await import("../src/models/revoked-token.model.js");
const deliveryService = await import("../src/services/delivery.service.js");
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

test("Delivery API is mounted and requires authentication", async () => {
    const response = await fetch(`${baseUrl}/api/deliveries`);
    const body = await response.json();

    assert.equal(response.status, 401);
    assert.equal(body.success, false);
});

test("delivery role matrix allows only expected actors", () => {
    for (const [role, allowedRoles, shouldAllow] of [
        ["owner", ["owner", "admin"], true],
        ["admin", ["owner", "admin"], true],
        ["shipper", ["owner", "admin"], false],
        ["shipper", ["shipper"], true],
        ["owner", ["shipper"], false],
    ]) {
        let error;
        authorizeRoles(...allowedRoles)({ user: { role } }, {}, (nextError) => {
            error = nextError;
        });

        if (shouldAllow) {
            assert.equal(error, undefined);
        } else {
            assert.equal(error instanceof AppError, true);
            assert.equal(error.statusCode, 403);
        }
    }
});

test("delivery model starts pending with null milestone timestamps", () => {
    const delivery = new Delivery({
        ownerId: "507f1f77bcf86cd799439011",
        pickupAddress: "Warehouse A",
        deliveryAddress: "Customer address",
    });

    assert.equal(delivery.status, "pending");
    assert.equal(delivery.arrivedAt, null);
    assert.equal(delivery.authorizedAt, null);
    assert.equal(delivery.completedAt, null);
});

test("owner delivery list is scoped to ownerId", async () => {
    const originalFind = Delivery.find;
    const ownerId = "507f1f77bcf86cd799439011";
    let receivedFilter;

    Delivery.find = (filter) => ({
        sort(sortOrder) {
            receivedFilter = filter;
            assert.deepEqual(sortOrder, { createdAt: -1 });
            return [];
        },
    });

    try {
        assert.deepEqual(await deliveryService.listDeliveries("owner", ownerId), []);
        assert.deepEqual(receivedFilter, { ownerId });
    } finally {
        Delivery.find = originalFind;
    }
});

test("shipper delivery list is scoped to assigned shipperId", async () => {
    const originalFind = Delivery.find;
    const shipperId = "507f1f77bcf86cd799439012";
    let receivedFilter;

    Delivery.find = (filter) => ({
        sort() {
            receivedFilter = filter;
            return [];
        },
    });

    try {
        await deliveryService.listDeliveries("shipper", shipperId);
        assert.deepEqual(receivedFilter, { shipperId });
    } finally {
        Delivery.find = originalFind;
    }
});

test("a shipper cannot retrieve another shipper's delivery", async () => {
    const originalFindOne = Delivery.findOne;
    const shipperId = "507f1f77bcf86cd799439012";
    const deliveryId = "507f1f77bcf86cd799439014";
    let receivedFilter;
    Delivery.findOne = async (filter) => {
        receivedFilter = filter;
        return null;
    };

    try {
        await assert.rejects(
            deliveryService.getDelivery("shipper", shipperId, deliveryId),
            (error) => error instanceof AppError && error.statusCode === 404,
        );
        assert.deepEqual(receivedFilter, { _id: deliveryId, shipperId });
    } finally {
        Delivery.findOne = originalFindOne;
    }
});

test("admin delivery list is global", async () => {
    const originalFind = Delivery.find;
    let receivedFilter;

    Delivery.find = (filter) => ({
        sort() {
            receivedFilter = filter;
            return [];
        },
    });

    try {
        await deliveryService.listDeliveries("admin", "507f1f77bcf86cd799439013");
        assert.deepEqual(receivedFilter, {});
    } finally {
        Delivery.find = originalFind;
    }
});

test("complete requires authorized state and is scoped to assigned shipper", async () => {
    const originalFindOneAndUpdate = Delivery.findOneAndUpdate;
    const originalFindOne = Delivery.findOne;
    const shipperId = "507f1f77bcf86cd799439012";
    const deliveryId = "507f1f77bcf86cd799439014";
    let updateCalled = false;

    Delivery.findOneAndUpdate = () => {
        updateCalled = true;
        return Promise.resolve(null);
    };
    Delivery.findOne = async (filter) => {
        assert.deepEqual(filter, { _id: deliveryId, shipperId });
        return { status: "authorized", unlockStatus: "failed" };
    };

    try {
        await assert.rejects(
            deliveryService.completeDelivery(shipperId, deliveryId),
            (error) => error instanceof AppError
                && error.statusCode === 409
                && error.errorCode === "DEVICE_UNLOCK_FAILED",
        );
        assert.equal(updateCalled, false);
    } finally {
        Delivery.findOneAndUpdate = originalFindOneAndUpdate;
        Delivery.findOne = originalFindOne;
    }
});

test("complete transitions only after an IoT unlock success is recorded", async () => {
    const originalFindOneAndUpdate = Delivery.findOneAndUpdate;
    const originalFindOne = Delivery.findOne;
    const shipperId = "507f1f77bcf86cd799439012";
    const deliveryId = "507f1f77bcf86cd799439014";
    let transitionFilter;
    Delivery.findOne = async () => ({ status: "authorized", unlockStatus: "succeeded" });
    Delivery.findOneAndUpdate = async (filter) => {
        transitionFilter = filter;
        return { _id: deliveryId, status: "completed" };
    };

    try {
        const completed = await deliveryService.completeDelivery(shipperId, deliveryId);
        assert.equal(completed.status, "completed");
        assert.deepEqual(transitionFilter, {
            _id: deliveryId,
            shipperId,
            unlockStatus: "succeeded",
            status: { $in: ["authorized"] },
        });
    } finally {
        Delivery.findOneAndUpdate = originalFindOneAndUpdate;
        Delivery.findOne = originalFindOne;
    }
});

test("arrive requires in-progress state", async () => {
    const originalFindOneAndUpdate = Delivery.findOneAndUpdate;
    const originalFindOne = Delivery.findOne;
    const shipperId = "507f1f77bcf86cd799439012";
    const deliveryId = "507f1f77bcf86cd799439014";
    let transitionFilter;

    Delivery.findOneAndUpdate = (filter) => {
        transitionFilter = filter;
        return Promise.resolve(null);
    };
    Delivery.findOne = (filter) => {
        if (filter.status === "arrived") {
            return Promise.resolve(null);
        }
        return { select: () => Promise.resolve({ status: "accepted" }) };
    };

    try {
        await assert.rejects(
            deliveryService.arriveAtDestination(shipperId, deliveryId),
            (error) => error instanceof AppError && error.statusCode === 409,
        );
        assert.deepEqual(transitionFilter.status, { $in: ["in-progress"] });
    } finally {
        Delivery.findOneAndUpdate = originalFindOneAndUpdate;
        Delivery.findOne = originalFindOne;
    }
});

test("delivery creation validates addresses before service execution", async () => {
    const originalExists = RevokedToken.exists;
    const originalFindById = User.findById;
    const ownerId = "507f1f77bcf86cd799439011";
    const token = jwt.sign({ ver: 0 }, process.env.JWT_SECRET, { subject: ownerId, expiresIn: "1h" });

    RevokedToken.exists = async () => null;
    User.findById = () => ({
        select: async () => ({ id: ownerId, role: "owner", status: "active", tokenVersion: 0 }),
    });

    try {
        const response = await fetch(`${baseUrl}/api/deliveries`, {
            method: "POST",
            headers: {
                authorization: `Bearer ${token}`,
                "content-type": "application/json",
            },
            body: JSON.stringify({ pickupAddress: "", deliveryAddress: "Destination" }),
        });
        const body = await response.json();

        assert.equal(response.status, 422);
        assert.equal(body.success, false);
        assert.ok(Array.isArray(body.data.errors));
    } finally {
        RevokedToken.exists = originalExists;
        User.findById = originalFindById;
    }
});