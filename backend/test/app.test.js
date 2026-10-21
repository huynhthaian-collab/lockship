import assert from "node:assert/strict";
import { once } from "node:events";
import { after, before, test } from "node:test";

process.env.JWT_SECRET = "lockship-test-secret-with-at-least-32-characters";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/lockship-test";

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

test("API health, validation, and authentication contracts", async (t) => {
    await t.test("returns the standard success envelope for health", async () => {
        const response = await fetch(`${baseUrl}/health`);
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.deepEqual(body, {
            success: true,
            message: "LOCKSHIP API is healthy.",
            data: {},
        });
    });

    await t.test("returns a standard validation error for an invalid registration", async () => {
        const response = await fetch(`${baseUrl}/api/v1/auth/register`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({}),
        });
        const body = await response.json();

        assert.equal(response.status, 422);
        assert.equal(body.success, false);
        assert.equal(body.message, "Request validation failed.");
        assert.ok(Array.isArray(body.data.errors));
    });

    await t.test("rejects requests to protected routes without a token", async () => {
        const response = await fetch(`${baseUrl}/api/v1/users`);
        const body = await response.json();

        assert.equal(response.status, 401);
        assert.equal(body.success, false);
        assert.equal(body.message, "Authentication is required.");
    });
});