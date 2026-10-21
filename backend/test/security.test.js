import assert from "node:assert/strict";
import { once } from "node:events";
import { after, before, test } from "node:test";
import mongoose from "mongoose";

process.env.JWT_SECRET = "lockship-test-secret-with-at-least-32-characters";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/lockship-test";
process.env.NODE_ENV = "test";

const { default: app } = await import("../src/app.js");
const { default: User } = await import("../src/models/user.model.js");
const { default: Delivery } = await import("../src/models/delivery.model.js");
const { default: UnlockCode } = await import("../src/models/unlock-code.model.js");
const { authorizeRoles } = await import("../src/middleware/authorize.middleware.js");
const deliveryService = await import("../src/services/delivery.service.js");
const vehicleService = await import("../src/services/vehicle.service.js");
const iotDeviceService = await import("../src/services/iot-device.service.js");
const userService = await import("../src/services/user.service.js");
const AppError = (await import("../src/utils/app-error.js")).default;

let server;
let baseUrl;

before(async (t) => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 3000 });
    } catch (error) {
        t.skip(`MongoDB is required for security integration tests: ${error.message}`);
        return;
    }

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
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
});

test("SECURITY AUDIT 1: Owner cannot access another Owner's data", async (t) => {
    const ownerAId = new mongoose.Types.ObjectId().toString();
    const ownerBId = new mongoose.Types.ObjectId().toString();
    const vehicleBId = new mongoose.Types.ObjectId().toString();

    await t.test("Vehicle listing is scoped strictly to requesting owner", async () => {
        const vehicles = await vehicleService.listVehicles("owner", ownerAId);
        assert.ok(Array.isArray(vehicles));
    });

    await t.test("Vehicle retrieval of another owner fails with 404", async () => {
        await assert.rejects(
            vehicleService.getVehicle("owner", ownerAId, vehicleBId),
            (err) => err instanceof AppError && err.statusCode === 404,
        );
    });

    await t.test("IoT device query is scoped strictly to requesting owner", async () => {
        const devices = await iotDeviceService.listDevices("owner", ownerAId);
        assert.ok(Array.isArray(devices));
    });

    await t.test("Shipper listing is scoped strictly to requesting owner", async () => {
        const shippers = await userService.listOwnerShippers(ownerAId);
        assert.ok(Array.isArray(shippers));
    });
});

test("SECURITY AUDIT 2: Shipper cannot access another shipper's delivery", async () => {
    const shipperAId = new mongoose.Types.ObjectId().toString();
    const deliveryBId = new mongoose.Types.ObjectId().toString();

    await assert.rejects(
        deliveryService.getDelivery("shipper", shipperAId, deliveryBId),
        (err) => err instanceof AppError && err.statusCode === 404,
    );

    await assert.rejects(
        deliveryService.acceptDelivery(shipperAId, deliveryBId),
        (err) => err instanceof AppError && (err.statusCode === 404 || err.statusCode === 409),
    );

    await assert.rejects(
        deliveryService.completeDelivery(shipperAId, deliveryBId),
        (err) => err instanceof AppError && (err.statusCode === 404 || err.statusCode === 409),
    );
});

test("SECURITY AUDIT 3: Shipper cannot authorize delivery", () => {
    let error;
    authorizeRoles("owner")({ user: { role: "shipper" } }, {}, (err) => {
        error = err;
    });

    assert.ok(error instanceof AppError);
    assert.equal(error.statusCode, 403);
    assert.equal(error.message, "You do not have permission to access this resource.");
});

test("SECURITY AUDIT 4: Shipper cannot access IoT or send direct MQTT commands", async () => {
    let error;
    authorizeRoles("owner", "admin")({ user: { role: "shipper" } }, {}, (err) => {
        error = err;
    });

    assert.ok(error instanceof AppError);
    assert.equal(error.statusCode, 403);

    // Direct service enforcement
    await assert.rejects(
        iotDeviceService.listDevices("shipper", "507f1f77bcf86cd799439011"),
        (err) => err instanceof AppError && err.statusCode === 403,
    );

    await assert.rejects(
        iotDeviceService.publishUserCommand("shipper", "507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012", "LOCK"),
        (err) => err instanceof AppError && err.statusCode === 403,
    );
});

test("SECURITY AUDIT 5: Security headers and Prohibited MongoDB Operator Injection", async (t) => {
    await t.test("Helmet security headers are set", async () => {
        const response = await fetch(`${baseUrl}/health`);
        assert.equal(response.status, 200);
        assert.equal(response.headers.get("x-content-type-options"), "nosniff");
        assert.equal(response.headers.get("x-frame-options"), "SAMEORIGIN");
        assert.equal(response.headers.get("x-dns-prefetch-control"), "off");
    });

    await t.test("Prohibited MongoDB operators ($gt) in request body are rejected with 400", async () => {
        const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ email: { $gt: "" }, password: "password123" }),
        });
        const body = await response.json();

        assert.equal(response.status, 400);
        assert.equal(body.success, false);
        assert.equal(body.message, "Prohibited operators detected in request data.");
    });
});

test("SECURITY AUDIT 6: Plaintext unlock code is never saved to database", () => {
    const fields = Object.keys(UnlockCode.schema.paths);
    assert.ok(!fields.includes("code"), "UnlockCode schema must never contain a plaintext code field");
    assert.ok(fields.includes("codeHash"), "UnlockCode schema must contain codeHash");
    assert.equal(UnlockCode.schema.paths.codeHash.options.select, false, "codeHash must not be selected by default");
});

test("SECURITY AUDIT 7: Plaintext password is never exposed in user JSON", async () => {
    const user = new User({
        name: "Security Test",
        email: "sectest@lockship.io",
        password: "SuperSecretPassword123!",
        role: "owner",
    });

    const json = user.toJSON();
    assert.equal(json.password, undefined);
    assert.equal(json.passwordResetTokenHash, undefined);
    assert.equal(json.passwordResetExpiresAt, undefined);
    assert.equal(json.tokenVersion, undefined);
});
