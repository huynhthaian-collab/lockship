import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { once } from "node:events";
import { after, before, test } from "node:test";
import AppError from "../src/utils/app-error.js";

process.env.JWT_SECRET = "lockship-test-secret-with-at-least-32-characters";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/lockship-test";
process.env.SMTP_HOST = "smtp.example.test";
process.env.SMTP_FROM = "LOCKSHIP <no-reply@example.test>";
process.env.SMTP_SECURE = "false";

const { env } = await import("../src/config/env.js");
const { default: Delivery } = await import("../src/models/delivery.model.js");
const { default: UnlockCode } = await import("../src/models/unlock-code.model.js");
const { default: Notification } = await import("../src/models/notification.model.js");
const { default: User } = await import("../src/models/user.model.js");
const { errorHandler } = await import("../src/middleware/error.middleware.js");
const unlockCodeService = await import("../src/services/unlock-code.service.js");
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

function authorizedDelivery(overrides = {}) {
    return {
        _id: "507f1f77bcf86cd799439013",
        id: "507f1f77bcf86cd799439013",
        ownerId: "507f1f77bcf86cd799439011",
        shipperId: "507f1f77bcf86cd799439012",
        vehicleId: "507f1f77bcf86cd799439016",
        pickupAddress: "Warehouse A",
        deliveryAddress: "15 Main Street",
        status: "authorized",
        ...overrides,
    };
}

test("shipper unlock endpoint is mounted and requires authentication", async () => {
    const response = await fetch(`${baseUrl}/api/deliveries/507f1f77bcf86cd799439013/unlock`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: "004281" }),
    });

    assert.equal(response.status, 401);

    const codeResponse = await fetch(`${baseUrl}/api/deliveries/507f1f77bcf86cd799439013/unlock-code`);
    assert.equal(codeResponse.status, 401);
});

test("unlock code hash is omitted from model JSON", () => {
    const unlockCode = new UnlockCode({
        deliveryId: "507f1f77bcf86cd799439013",
        ownerId: "507f1f77bcf86cd799439011",
        shipperId: "507f1f77bcf86cd799439012",
        codeHash: "$2a$12$stored-bcrypt-hash",
        expiresAt: new Date(Date.now() + 60000),
    });

    assert.equal(Object.hasOwn(unlockCode.toJSON(), "codeHash"), false);
});

test("error response includes the named machine-readable code", () => {
    let responseBody;
    let responseStatus;
    const response = {
        status(status) {
            responseStatus = status;
            return this;
        },
        json(body) {
            responseBody = body;
            return this;
        },
    };

    errorHandler(new AppError("Unlock code is incorrect.", 401, null, "INVALID_CODE"), {}, response, () => { });

    assert.equal(responseStatus, 401);
    assert.equal(responseBody.success, false);
    assert.equal(responseBody.data.errorCode, "INVALID_CODE");
});

test("owner authorization stores only a hash and emails a new six-digit code to the shipper", async () => {
    const originalDeliveryFindOne = Delivery.findOne;
    const originalDeliveryUpdate = Delivery.findOneAndUpdate;
    const originalUserFindOne = User.findOne;
    const originalCodeUpsert = UnlockCode.findOneAndUpdate;
    const originalCodeFind = UnlockCode.findOne;
    const originalCreateTransport = nodemailer.createTransport;
    const originalNotificationUpsert = Notification.findOneAndUpdate;
    const delivery = authorizedDelivery({ status: "arrived" });
    let storedCodeRecord;
    let sentMail;
    let transportOptions;
    let notification;

    Delivery.findOne = async () => delivery;
    Delivery.findOneAndUpdate = async () => authorizedDelivery();
    User.findOne = () => ({ select: async () => ({ email: "shipper@example.test" }) });
    UnlockCode.findOneAndUpdate = async (_filter, update) => {
        storedCodeRecord = update.$set;
        return storedCodeRecord;
    };
    UnlockCode.findOne = () => ({ select: async () => storedCodeRecord });
    Notification.findOneAndUpdate = async (filter, update) => {
        notification = { ...filter, ...update.$set, id: "507f1f77bcf86cd799439017" };
        return notification;
    };
    nodemailer.createTransport = (options) => {
        transportOptions = options;
        return {
            sendMail: async (mail) => {
                sentMail = mail;
                return { accepted: [mail.to] };
            },
        };
    };

    try {
        const result = await deliveryService.authorizeDelivery(delivery.ownerId, delivery.id);
        const code = sentMail.text.match(/code is (\d{6})\./)?.[1];

        assert.equal(sentMail.to, "shipper@example.test");
        assert.equal(transportOptions.secure, false);
        assert.equal(transportOptions.requireTLS, true);
        assert.ok(code);
        assert.equal(await bcrypt.compare(code, storedCodeRecord.codeHash), true);
        assert.notEqual(storedCodeRecord.codeHash, code);
        assert.notEqual(storedCodeRecord.encryptedCode, code);
        assert.equal(storedCodeRecord.used, false);
        assert.equal(storedCodeRecord.attempts, 0);
        assert.equal(notification.userId, delivery.shipperId);
        assert.equal(notification.deliveryId, delivery._id);
        assert.equal(notification.type, "unlock_code_issued");
        assert.equal(notification.message.includes(code), false);
        assert.ok(result.expiresAt instanceof Date);
        assert.equal(Object.hasOwn(result, "code"), false);
        assert.equal(JSON.stringify(result).includes(code), false);

        Delivery.findOne = async () => authorizedDelivery();
        const activeCode = await unlockCodeService.getActiveUnlockCode(delivery.shipperId, delivery.id);
        assert.equal(activeCode.code, code);
        assert.equal(activeCode.deliveryId, delivery.id);
        assert.equal(activeCode.expiresAt.getTime(), result.expiresAt.getTime());
    } finally {
        Delivery.findOne = originalDeliveryFindOne;
        Delivery.findOneAndUpdate = originalDeliveryUpdate;
        User.findOne = originalUserFindOne;
        UnlockCode.findOneAndUpdate = originalCodeUpsert;
        UnlockCode.findOne = originalCodeFind;
        Notification.findOneAndUpdate = originalNotificationUpsert;
        nodemailer.createTransport = originalCreateTransport;
    }
});

test("shipper cannot retrieve an unlock code for another shipper's delivery", async () => {
    const originalDeliveryFindOne = Delivery.findOne;
    let receivedFilter;
    Delivery.findOne = async (filter) => {
        receivedFilter = filter;
        return null;
    };

    try {
        await assert.rejects(
            unlockCodeService.getActiveUnlockCode(
                "507f1f77bcf86cd799439018",
                "507f1f77bcf86cd799439013",
            ),
            (error) => error instanceof AppError && error.statusCode === 404,
        );
        assert.deepEqual(receivedFilter, {
            _id: "507f1f77bcf86cd799439013",
            shipperId: "507f1f77bcf86cd799439018",
        });
    } finally {
        Delivery.findOne = originalDeliveryFindOne;
    }
});

test("successful code verification atomically consumes the code", async () => {
    const originalDeliveryFindOne = Delivery.findOne;
    const originalDeliveryUpdate = Delivery.findOneAndUpdate;
    const originalCodeFindOne = UnlockCode.findOne;
    const originalCodeConsume = UnlockCode.findOneAndUpdate;
    const delivery = authorizedDelivery();
    const codeHash = await bcrypt.hash("004281", 4);
    let consumeFilter;
    let consumeUpdate;
    let pendingDeliveryFilter;
    let pendingDeliveryUpdate;

    Delivery.findOne = async () => delivery;
    Delivery.findOneAndUpdate = async (filter, update) => {
        pendingDeliveryFilter = filter;
        pendingDeliveryUpdate = update;
        return { ...delivery, unlockStatus: update.$set.unlockStatus };
    };
    UnlockCode.findOne = () => ({
        select: async () => ({
            _id: "507f1f77bcf86cd799439015",
            codeHash,
            expiresAt: new Date(Date.now() + 60000),
            used: false,
            attempts: 0,
        }),
    });
    UnlockCode.findOneAndUpdate = async (filter, update) => {
        consumeFilter = filter;
        consumeUpdate = update;
        return { usedAt: update.$set.usedAt };
    };

    try {
        const result = await unlockCodeService.verifyUnlockCode(
            delivery.shipperId,
            delivery.id,
            "004281",
            {
                assertReady: async (vehicleId, ownerId) => {
                    assert.equal(vehicleId, delivery.vehicleId);
                    assert.equal(ownerId, delivery.ownerId);
                },
                publishUnlock: async (vehicleId, ownerId, deliveryId) => {
                    assert.equal(vehicleId, delivery.vehicleId);
                    assert.equal(ownerId, delivery.ownerId);
                    assert.equal(deliveryId, delivery.id);
                    return { requestId: "unlock-request-1" };
                },
            },
        );

        assert.deepEqual(consumeFilter, {
            _id: "507f1f77bcf86cd799439015",
            codeHash,
            used: false,
            attempts: { $lt: env.UNLOCK_CODE_MAX_ATTEMPTS },
            expiresAt: consumeFilter.expiresAt,
        });
        assert.ok(consumeFilter.expiresAt.$gt instanceof Date);
        assert.equal(consumeUpdate.$set.used, true);
        assert.deepEqual(pendingDeliveryFilter, {
            _id: delivery.id,
            ownerId: delivery.ownerId,
            shipperId: delivery.shipperId,
            status: "authorized",
        });
        assert.deepEqual(pendingDeliveryUpdate, { $set: { unlockStatus: "pending" } });
        assert.equal(result.verified, true);
        assert.equal(result.unlockCommandPending, true);
        assert.equal(result.requestId, "unlock-request-1");
        assert.equal(Object.hasOwn(result, "codeHash"), false);
    } finally {
        Delivery.findOne = originalDeliveryFindOne;
        Delivery.findOneAndUpdate = originalDeliveryUpdate;
        UnlockCode.findOne = originalCodeFindOne;
        UnlockCode.findOneAndUpdate = originalCodeConsume;
    }
});

test("incorrect code increments attempts and returns unauthorized", async () => {
    const originalDeliveryFindOne = Delivery.findOne;
    const originalCodeFindOne = UnlockCode.findOne;
    const originalCodeUpdate = UnlockCode.updateOne;
    const delivery = authorizedDelivery();
    const codeHash = await bcrypt.hash("123456", 4);
    let attemptFilter;

    Delivery.findOne = async () => delivery;
    UnlockCode.findOne = () => ({
        select: async () => ({
            _id: "507f1f77bcf86cd799439015",
            codeHash,
            expiresAt: new Date(Date.now() + 60000),
            used: false,
            attempts: 0,
        }),
    });
    UnlockCode.updateOne = async (filter) => {
        attemptFilter = filter;
        return { modifiedCount: 1 };
    };

    try {
        await assert.rejects(
            unlockCodeService.verifyUnlockCode(delivery.shipperId, delivery.id, "999999"),
            (error) => error instanceof AppError
                && error.statusCode === 401
                && error.errorCode === "INVALID_CODE",
        );
        assert.equal(attemptFilter.codeHash, codeHash);
        assert.equal(attemptFilter.attempts.$lt, env.UNLOCK_CODE_MAX_ATTEMPTS);
    } finally {
        Delivery.findOne = originalDeliveryFindOne;
        UnlockCode.findOne = originalCodeFindOne;
        UnlockCode.updateOne = originalCodeUpdate;
    }
});

test("expired, exhausted, and previously used codes are rejected", async (t) => {
    const originalDeliveryFindOne = Delivery.findOne;
    const originalCodeFindOne = UnlockCode.findOne;
    const originalCodeUpdate = UnlockCode.updateOne;
    const delivery = authorizedDelivery();
    let invalidationCount = 0;

    Delivery.findOne = async () => delivery;
    UnlockCode.updateOne = async () => {
        invalidationCount += 1;
        return { modifiedCount: 1 };
    };

    try {
        for (const [name, record, expectedStatus, expectedErrorCode] of [
            ["expired", { used: false, attempts: 0, expiresAt: new Date(Date.now() - 1000) }, 410, "CODE_EXPIRED"],
            ["exhausted", { used: false, attempts: env.UNLOCK_CODE_MAX_ATTEMPTS, expiresAt: new Date(Date.now() + 60000) }, 429, "MAX_ATTEMPTS"],
            ["used", { used: true, attempts: 0, expiresAt: new Date(Date.now() + 60000) }, 409, "CODE_ALREADY_USED"],
        ]) {
            await t.test(`${name} unlock code`, async () => {
                UnlockCode.findOne = () => ({
                    select: async () => ({
                        _id: "507f1f77bcf86cd799439015",
                        codeHash: "stored-hash",
                        ...record,
                    }),
                });

                await assert.rejects(
                    unlockCodeService.verifyUnlockCode(delivery.shipperId, delivery.id, "004281"),
                    (error) => error instanceof AppError
                        && error.statusCode === expectedStatus
                        && error.errorCode === expectedErrorCode,
                );
            });
        }
        assert.equal(invalidationCount, 1);
    } finally {
        Delivery.findOne = originalDeliveryFindOne;
        UnlockCode.findOne = originalCodeFindOne;
        UnlockCode.updateOne = originalCodeUpdate;
    }
});

test("verification refuses deliveries not yet authorized", async () => {
    const originalDeliveryFindOne = Delivery.findOne;
    const originalCodeFindOne = UnlockCode.findOne;
    let codeLookupCalled = false;

    Delivery.findOne = async () => authorizedDelivery({ status: "arrived" });
    UnlockCode.findOne = () => {
        codeLookupCalled = true;
        throw new Error("Unlock code must not be queried before authorization.");
    };

    try {
        await assert.rejects(
            unlockCodeService.verifyUnlockCode("507f1f77bcf86cd799439012", "507f1f77bcf86cd799439013", "004281"),
            (error) => error instanceof AppError
                && error.statusCode === 409
                && error.errorCode === "DELIVERY_NOT_AUTHORIZED",
        );
        assert.equal(codeLookupCalled, false);
    } finally {
        Delivery.findOne = originalDeliveryFindOne;
        UnlockCode.findOne = originalCodeFindOne;
    }
});
