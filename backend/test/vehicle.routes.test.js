import assert from "node:assert/strict";
import { once } from "node:events";
import { after, before, test } from "node:test";
import AppError from "../src/utils/app-error.js";
import { authorizeRoles } from "../src/middleware/authorize.middleware.js";

process.env.JWT_SECRET = "lockship-test-secret-with-at-least-32-characters";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/lockship-test";

const { default: Vehicle } = await import("../src/models/vehicle.model.js");
const vehicleService = await import("../src/services/vehicle.service.js");
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

test("requested Vehicle API is mounted and requires a JWT", async () => {
    const response = await fetch(`${baseUrl}/api/vehicles`);
    const body = await response.json();

    assert.equal(response.status, 401);
    assert.equal(body.success, false);
    assert.equal(body.message, "Authentication is required.");
});

test("vehicle role authorization allows owners and admins, but rejects shippers", () => {
    for (const [role, shouldAllow] of [["owner", true], ["admin", true], ["shipper", false]]) {
        let error;
        authorizeRoles("owner", "admin")({ user: { role } }, {}, (nextError) => {
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

test("owner vehicle listing is scoped to the authenticated owner", async () => {
    const originalFind = Vehicle.find;
    const ownerId = "507f1f77bcf86cd799439011";
    let receivedFilter;

    Vehicle.find = (filter) => ({
        sort(sortOrder) {
            receivedFilter = filter;
            assert.deepEqual(sortOrder, { createdAt: -1 });
            return [];
        },
    });

    try {
        assert.deepEqual(await vehicleService.listVehicles("owner", ownerId), []);
        assert.deepEqual(receivedFilter, { ownerId });
    } finally {
        Vehicle.find = originalFind;
    }
});

test("an owner cannot retrieve another owner's vehicle", async () => {
    const originalFindOne = Vehicle.findOne;
    const ownerId = "507f1f77bcf86cd799439011";
    const vehicleId = "507f1f77bcf86cd799439012";
    let receivedFilter;
    Vehicle.findOne = async (filter) => {
        receivedFilter = filter;
        return null;
    };

    try {
        await assert.rejects(
            vehicleService.getVehicle("owner", ownerId, vehicleId),
            (error) => error instanceof AppError && error.statusCode === 404,
        );
        assert.deepEqual(receivedFilter, { _id: vehicleId, ownerId });
    } finally {
        Vehicle.findOne = originalFindOne;
    }
});

test("admin vehicle listing is not restricted to one owner", async () => {
    const originalFind = Vehicle.find;
    let receivedFilter;

    Vehicle.find = (filter) => ({
        sort() {
            receivedFilter = filter;
            return [];
        },
    });

    try {
        await vehicleService.listVehicles("admin", "507f1f77bcf86cd799439011");
        assert.deepEqual(receivedFilter, {});
    } finally {
        Vehicle.find = originalFind;
    }
});

test("vehicle service rejects shipper role even when called outside the router", async () => {
    await assert.rejects(
        vehicleService.listVehicles("shipper", "507f1f77bcf86cd799439011"),
        (error) => error instanceof AppError && error.statusCode === 403,
    );
});

test("invalid vehicle ObjectIds are rejected before querying MongoDB", async () => {
    await assert.rejects(
        vehicleService.getVehicle("owner", "507f1f77bcf86cd799439011", "invalid-id"),
        (error) => error instanceof AppError && error.statusCode === 400,
    );
});