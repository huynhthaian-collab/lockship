import assert from "node:assert/strict";
import { once } from "node:events";
import { after, before, test } from "node:test";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET = "lockship-test-secret-with-at-least-32-characters";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/lockship-test";

const { default: User } = await import("../src/models/user.model.js");
const { default: RevokedToken } = await import("../src/models/revoked-token.model.js");
const { default: app } = await import("../src/app.js");

let server;
let baseUrl;

const adminId = "507f1f77bcf86cd799439010";
const ownerId = "507f1f77bcf86cd799439011";
const shipperId = "507f1f77bcf86cd799439012";

const users = new Map([
    [adminId, { id: adminId, _id: adminId, name: "Admin User", role: "admin", status: "active", tokenVersion: 0 }],
    [ownerId, { id: ownerId, _id: ownerId, name: "Bùi Tú Anh", role: "owner", status: "active", tokenVersion: 0 }],
    [shipperId, { id: shipperId, _id: shipperId, name: "Shipper User", role: "shipper", status: "active", tokenVersion: 0 }],
]);

function makeToken(userId, role) {
    return jwt.sign({ ver: 0, role }, process.env.JWT_SECRET, { subject: userId, expiresIn: "1h" });
}

before(async () => {
    User.findById = (id) => ({
        select: async () => users.get(String(id)) ?? null,
    });
    RevokedToken.exists = async () => null;

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

test("Box Registration: Owner submitting empty or short requestedAddress (<10 chars) is rejected with 400", async () => {
    const ownerToken = makeToken(ownerId, "owner");

    // 1. Missing requestedAddress
    const resEmpty = await fetch(`${baseUrl}/api/boxes/LOCKSHIP-BOX-015/request-registration`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${ownerToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ requestedAddress: "" }),
    });
    const bodyEmpty = await resEmpty.json();

    assert.equal(resEmpty.status, 400);
    assert.equal(bodyEmpty.success, false);
    assert.match(bodyEmpty.message, /bắt buộc và phải có ít nhất 10 ký tự/);

    // 2. Short requestedAddress (< 10 chars)
    const resShort = await fetch(`${baseUrl}/api/boxes/LOCKSHIP-BOX-015/request-registration`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${ownerToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ requestedAddress: "Cần Thơ" }),
    });
    const bodyShort = await resShort.json();

    assert.equal(resShort.status, 400);
    assert.equal(bodyShort.success, false);
    assert.match(bodyShort.message, /bắt buộc và phải có ít nhất 10 ký tự/);
});

test("Box Registration: Shipper cannot request box registration (403)", async () => {
    const shipperToken = makeToken(shipperId, "shipper");

    const res = await fetch(`${baseUrl}/api/boxes/LOCKSHIP-BOX-015/request-registration`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${shipperToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ requestedAddress: "Số 12 Đường 3/2, P. Xuân Khánh, Cần Thơ" }),
    });

    assert.equal(res.status, 403);
});

test("Admin Installation Approval: Non-admin cannot confirm installation (403)", async () => {
    const ownerToken = makeToken(ownerId, "owner");

    const res = await fetch(`${baseUrl}/api/boxes/LOCKSHIP-BOX-015/confirm-installation`, {
        method: "PATCH",
        headers: {
            Authorization: `Bearer ${ownerToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            address: "Số 12 Đường 3/2, P. Xuân Khánh, Q. Ninh Kiều, Cần Thơ",
            location: { lat: 10.0299, lng: 105.7706 },
        }),
    });

    assert.equal(res.status, 403);
});

test("Admin Installation Approval: Invalid GPS coordinates are rejected with 422", async () => {
    const adminToken = makeToken(adminId, "admin");

    const res = await fetch(`${baseUrl}/api/boxes/LOCKSHIP-BOX-015/confirm-installation`, {
        method: "PATCH",
        headers: {
            Authorization: `Bearer ${adminToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            address: "Số 12 Đường 3/2, P. Xuân Khánh, Q. Ninh Kiều, Cần Thơ",
            location: { lat: "not-a-number", lng: null },
        }),
    });
    const body = await res.json();

    assert.equal(res.status, 422);
    assert.equal(body.success, false);
    assert.match(body.message, /Tọa độ GPS/);
});

test("Invoices: Owner can fetch current monthly invoice with MoMo configuration", async () => {
    const ownerToken = makeToken(ownerId, "owner");

    const res = await fetch(`${baseUrl}/api/invoices/current`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${ownerToken}`,
        },
    });
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.ok(body.data.invoice);
    assert.equal(body.data.invoice.unitPrice, 5000);
    assert.ok(body.data.momoConfig);
    assert.equal(body.data.momoConfig.phone, "0909000001");
});
