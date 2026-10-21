import assert from "node:assert/strict";
import { once } from "node:events";
import { after, before, test } from "node:test";

process.env.JWT_SECRET = "lockship-test-secret-with-at-least-32-characters";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/lockship-test";
process.env.GOOGLE_CLIENT_ID = "";
process.env.GOOGLE_CLIENT_SECRET = "";

const { default: app } = await import("../src/app.js");
const { default: User } = await import("../src/models/user.model.js");
const authService = await import("../src/services/auth.service.js");
const { env } = await import("../src/config/env.js");
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

test("Phase 2 authentication route contracts", async (t) => {
    const invalidRequests = [
        ["POST", "/api/auth/register", {}],
        ["POST", "/api/auth/login", {}],
        ["POST", "/api/auth/forgot-password", {}],
        ["POST", "/api/auth/forgot-password/verify", {}],
        ["POST", "/api/auth/forgot-password/resend-otp", {}],
        ["POST", "/api/auth/register/verify", {}],
        ["POST", "/api/auth/register/resend-otp", {}],
        ["POST", "/api/auth/reset-password", {}],
        ["POST", "/api/v1/auth/forgot-password", {}],
    ];

    for (const [method, path, body] of invalidRequests) {
        await t.test(`validates ${method} ${path}`, async () => {
            const response = await fetch(`${baseUrl}${path}`, {
                method,
                headers: { "content-type": "application/json" },
                body: JSON.stringify(body),
            });
            const responseBody = await response.json();

            assert.equal(response.status, 422);
            assert.equal(responseBody.success, false);
            assert.ok(Array.isArray(responseBody.data.errors));
        });
    }

    for (const [method, path] of [
        ["GET", "/api/auth/me"],
        ["PUT", "/api/auth/profile"],
        ["PUT", "/api/auth/change-password"],
    ]) {
        await t.test(`requires authentication for ${method} ${path}`, async () => {
            const response = await fetch(`${baseUrl}${path}`, {
                method,
                headers: { "content-type": "application/json" },
                body: method === "GET" ? undefined : JSON.stringify({ name: "Lockship User" }),
            });

            assert.equal(response.status, 401);
        });
    }
});

test("Google OAuth redirects safely when configuration is missing or state is invalid", async (t) => {
    await t.test("redirects to login when Google OAuth is not configured", async () => {
        const response = await fetch(`${baseUrl}/api/auth/google`, { redirect: "manual" });
        const location = new URL(response.headers.get("location"));

        assert.equal(response.status, 302);
        assert.equal(location.origin, "http://localhost:5173");
        assert.equal(location.pathname, "/login");
        assert.equal(location.searchParams.get("googleError"), "google_not_configured");
    });

    await t.test("rejects a callback without a matching state cookie", async () => {
        const response = await fetch(`${baseUrl}/api/auth/google/callback?code=test&state=wrong`, {
            redirect: "manual",
        });
        const location = new URL(response.headers.get("location"));

        assert.equal(response.status, 302);
        assert.equal(location.pathname, "/login");
        assert.equal(location.searchParams.get("googleError"), "google_invalid_state");
    });

    await t.test("rejects admin as a Google profile role", async () => {
        const response = await fetch(`${baseUrl}/api/auth/google/complete-profile`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ role: "admin", address: "123 LockShip Street" }),
        });

        assert.equal(response.status, 422);
    });
});

test("session checks do not consume login quota and real login attempts remain limited", {
    skip: env.NODE_ENV === "test",
}, async () => {
    const loginLimit = env.NODE_ENV === "development" ? 20 : 10;

    for (let attempt = 0; attempt < loginLimit + 5; attempt += 1) {
        const response = await fetch(`${baseUrl}/api/auth/me`);
        assert.equal(response.status, 401);
    }

    const loginResponses = [];
    for (let attempt = 0; attempt < loginLimit + 2; attempt += 1) {
        const response = await fetch(`${baseUrl}/api/auth/login`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({}),
        });
        loginResponses.push({
            status: response.status,
            body: await response.json(),
        });
    }

    assert.ok(loginResponses.some(({ status }) => status === 422));
    const limitedResponse = loginResponses.find(({ status }) => status === 429);
    assert.ok(limitedResponse);
    assert.equal(limitedResponse.body.data.errorCode, "AUTH_RATE_LIMITED");
});

test("logout clears the HttpOnly session cookie without requiring a live session", async () => {
    const response = await fetch(`${baseUrl}/api/auth/logout`, { method: "POST" });
    const responseBody = await response.json();
    const cookie = response.headers.get("set-cookie") || "";

    assert.equal(response.status, 200);
    assert.equal(responseBody.success, true);
    assert.match(cookie, /lockship_session=/);
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /Expires=.*1970/i);
});

test("user serialization never exposes passwords or reset credentials", () => {
    const user = new User({
        name: "Lockship User",
        email: "user@example.com",
        password: "PlaintextPassword123",
        passwordResetTokenHash: "reset-token-hash",
        passwordResetExpiresAt: new Date(),
        tokenVersion: 3,
    });
    const serializedUser = user.toJSON();

    assert.equal(Object.hasOwn(serializedUser, "password"), false);
    assert.equal(Object.hasOwn(serializedUser, "passwordResetTokenHash"), false);
    assert.equal(Object.hasOwn(serializedUser, "passwordResetExpiresAt"), false);
    assert.equal(Object.hasOwn(serializedUser, "tokenVersion"), false);
    assert.equal(Object.hasOwn(serializedUser, "registrationPending"), false);
});

test("Google-only user documents do not require or expose a local password or Google id", () => {
    const user = new User({
        name: "Google User",
        email: "google@example.com",
        googleId: "google-subject",
        authProvider: "google",
        role: "owner",
        address: "123 LockShip Street",
    });

    assert.equal(user.validateSync(), undefined);
    const serializedUser = user.toJSON();
    assert.equal(Object.hasOwn(serializedUser, "password"), false);
    assert.equal(Object.hasOwn(serializedUser, "googleId"), false);
    assert.equal(serializedUser.authProvider, "google");
});

test("self-profile updates persist allowed fields without changing protected account data", async () => {
    const originalFindById = User.findById;
    const userId = "507f1f77bcf86cd799439011";
    let saveCount = 0;
    const user = {
        id: userId,
        name: "Before Name",
        email: "user@example.com",
        phone: null,
        address: "123 Old Street",
        avatar: null,
        role: "owner",
        status: "active",
        password: "already-hashed",
        save: async () => { saveCount += 1; },
    };
    User.findById = async (requestedId) => {
        assert.equal(requestedId, userId);
        return user;
    };

    try {
        const updated = await authService.updateUserProfile(userId, {
            name: "Updated Name",
            phone: "+84 901 234 567",
            address: "456 New Street",
            avatar: "https://example.test/avatar.png",
            email: "attacker@example.test",
            role: "admin",
            status: "suspended",
            password: "PlaintextPassword123",
            _id: "507f1f77bcf86cd799439012",
        });

        assert.equal(updated, user);
        assert.equal(saveCount, 1);
        assert.equal(user.name, "Updated Name");
        assert.equal(user.phone, "+84 901 234 567");
        assert.equal(user.address, "456 New Street");
        assert.equal(user.avatar, "https://example.test/avatar.png");
        assert.equal(user.email, "user@example.com");
        assert.equal(user.role, "owner");
        assert.equal(user.status, "active");
        assert.equal(user.password, "already-hashed");
        assert.equal(user.id, userId);
    } finally {
        User.findById = originalFindById;
    }
});

test("self-profile update does not report success when persistence fails", async () => {
    const originalFindById = User.findById;
    const user = {
        name: "Before Name",
        save: async () => { throw new Error("database unavailable"); },
    };
    User.findById = async () => user;

    try {
        await assert.rejects(
            authService.updateUserProfile("507f1f77bcf86cd799439011", { name: "Updated Name" }),
            /database unavailable/,
        );
        assert.equal(user.name, "Updated Name");
    } finally {
        User.findById = originalFindById;
    }
});