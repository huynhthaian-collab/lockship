import assert from "node:assert/strict";
import { test } from "node:test";
import AppError from "../src/utils/app-error.js";
import { authorizeRoles } from "../src/middleware/authorize.middleware.js";

process.env.JWT_SECRET = "lockship-test-secret-with-at-least-32-characters";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/lockship-test";

const { default: User } = await import("../src/models/user.model.js");
const userService = await import("../src/services/user.service.js");

test("role authorization keeps owner and admin management boundaries", () => {
    const cases = [
        { role: "owner", allowed: ["owner"], allowedThrough: true },
        { role: "admin", allowed: ["owner"], allowedThrough: false },
        { role: "shipper", allowed: ["admin"], allowedThrough: false },
        { role: "admin", allowed: ["admin"], allowedThrough: true },
    ];

    for (const { role, allowed, allowedThrough } of cases) {
        let error;
        let nextCalled = false;
        authorizeRoles(...allowed)({ user: { role } }, {}, (nextError) => {
            error = nextError;
            nextCalled = true;
        });

        assert.equal(nextCalled, true);
        if (allowedThrough) {
            assert.equal(error, undefined);
        } else {
            assert.equal(error instanceof AppError, true);
            assert.equal(error.statusCode, 403);
        }
    }
});

test("owner shipper listing is constrained to the authenticated owner", async () => {
    const originalFind = User.find;
    const ownerId = "507f1f77bcf86cd799439011";
    let receivedFilter;

    User.find = (filter) => ({
        sort(sortOrder) {
            receivedFilter = filter;
            assert.deepEqual(sortOrder, { createdAt: -1 });
            return [];
        },
    });

    try {
        assert.deepEqual(await userService.listOwnerShippers(ownerId), []);
        assert.deepEqual(receivedFilter, { role: "shipper", ownerId });
    } finally {
        User.find = originalFind;
    }
});

test("malformed user IDs are rejected before querying MongoDB", async () => {
    await assert.rejects(
        userService.getUser("not-a-mongodb-object-id"),
        (error) => error instanceof AppError && error.statusCode === 400,
    );
});

test("status and role changes invalidate previously issued user tokens", async () => {
    const originalFindById = User.findById;
    const userId = "507f1f77bcf86cd799439012";
    const user = {
        id: userId,
        _id: userId,
        role: "owner",
        status: "active",
        tokenVersion: 0,
        save: async () => {},
    };
    User.findById = () => ({
        select: async (fields) => {
            assert.equal(fields, "+tokenVersion");
            return user;
        },
    });

    try {
        await userService.updateUserStatus("507f1f77bcf86cd799439011", userId, "inactive");
        assert.equal(user.tokenVersion, 1);

        await userService.updateUserRole("507f1f77bcf86cd799439011", userId, "admin");
        assert.equal(user.tokenVersion, 2);
    } finally {
        User.findById = originalFindById;
    }
});

test("admin profile updates allow profile fields but ignore protected fields in the service", async () => {
    const originalFindById = User.findById;
    const userId = "507f1f77bcf86cd799439012";
    let saveCount = 0;
    const user = {
        id: userId,
        _id: userId,
        name: "Before Name",
        email: "before@example.com",
        phone: null,
        address: "123 Old Street",
        avatar: null,
        role: "shipper",
        status: "active",
        password: "already-hashed",
        save: async () => { saveCount += 1; },
    };
    User.findById = () => ({
        select: async (fields) => {
            assert.equal(fields, "+tokenVersion");
            return user;
        },
    });

    try {
        const updated = await userService.updateUser(userId, {
            name: "Updated Name",
            email: "updated@example.com",
            phone: "+84 901 234 567",
            address: "456 New Street",
            avatar: "https://example.test/avatar.png",
            role: "admin",
            status: "suspended",
            password: "PlaintextPassword123",
            _id: "507f1f77bcf86cd799439011",
        });

        assert.equal(updated, user);
        assert.equal(saveCount, 1);
        assert.equal(user.name, "Updated Name");
        assert.equal(user.email, "updated@example.com");
        assert.equal(user.phone, "+84 901 234 567");
        assert.equal(user.address, "456 New Street");
        assert.equal(user.avatar, "https://example.test/avatar.png");
        assert.equal(user.role, "shipper");
        assert.equal(user.status, "active");
        assert.equal(user.password, "already-hashed");
        assert.equal(user.id, userId);
    } finally {
        User.findById = originalFindById;
    }
});