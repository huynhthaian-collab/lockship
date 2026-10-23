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
    [ownerId, { id: ownerId, _id: ownerId, name: "Owner User", role: "owner", status: "active", tokenVersion: 0 }],
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

test("Box QR security: unauthenticated requests are rejected with 401", async () => {
    const res = await fetch(`${baseUrl}/api/boxes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boxId: "LOCKSHIP-BOX-001" }),
    });
    const body = await res.json();
    assert.equal(res.status, 401);
    assert.equal(body.success, false);
});

test("Box QR security: Owner attempting to create box or generate QR is rejected with 403 Forbidden", async () => {
    const ownerToken = makeToken(ownerId, "owner");

    // 1. Owner tries to POST /api/boxes
    const resCreate = await fetch(`${baseUrl}/api/boxes`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${ownerToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ boxId: "LOCKSHIP-BOX-TEST" }),
    });
    const bodyCreate = await resCreate.json();

    assert.equal(resCreate.status, 403);
    assert.equal(bodyCreate.success, false);
    assert.equal(bodyCreate.message, "Chỉ Quản trị viên (Admin) mới có quyền tạo và cấp phát mã QR cho tủ khóa.");

    // 2. Owner tries to POST /api/boxes/:id/generate-qr
    const resGen = await fetch(`${baseUrl}/api/boxes/LOCKSHIP-BOX-001/generate-qr`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${ownerToken}`,
            "Content-Type": "application/json",
        },
    });
    const bodyGen = await resGen.json();

    assert.equal(resGen.status, 403);
    assert.equal(bodyGen.success, false);
    assert.equal(bodyGen.message, "Chỉ Quản trị viên (Admin) mới có quyền tạo và cấp phát mã QR cho tủ khóa.");
});

test("Box QR security: Shipper attempting to generate QR is rejected with 403 Forbidden", async () => {
    const shipperToken = makeToken(shipperId, "shipper");

    const res = await fetch(`${baseUrl}/api/boxes/LOCKSHIP-BOX-001/generate-qr`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${shipperToken}`,
            "Content-Type": "application/json",
        },
    });
    const body = await res.json();

    assert.equal(res.status, 403);
    assert.equal(body.success, false);
    assert.equal(body.message, "Chỉ Quản trị viên (Admin) mới có quyền tạo và cấp phát mã QR cho tủ khóa.");
});

test("Box QR security: Admin is authorized to create box and generate QR code", async () => {
    const adminToken = makeToken(adminId, "admin");

    // 1. Admin creates box
    const resCreate = await fetch(`${baseUrl}/api/boxes`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${adminToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            boxId: "LOCKSHIP-BOX-099",
            name: "Trạm Tủ Thử Nghiệm",
            address: "123 Đường 30 Tháng 4, Cần Thơ",
        }),
    });
    const bodyCreate = await resCreate.json();

    assert.equal(resCreate.status, 201);
    assert.equal(bodyCreate.success, true);
    assert.equal(bodyCreate.data.box.boxId, "LOCKSHIP-BOX-099");
    assert.ok(bodyCreate.data.box.qrUrl);
    assert.ok(bodyCreate.data.box.qrImageUrl);

    // 2. Admin generates QR code for a box
    const resGen = await fetch(`${baseUrl}/api/boxes/LOCKSHIP-BOX-099/generate-qr`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${adminToken}`,
            "Content-Type": "application/json",
        },
    });
    const bodyGen = await resGen.json();

    assert.equal(resGen.status, 200);
    assert.equal(bodyGen.success, true);
    assert.equal(bodyGen.data.boxId, "LOCKSHIP-BOX-099");
    assert.ok(bodyGen.data.qrUrl.includes("LOCKSHIP-BOX-099"));
    assert.ok(bodyGen.data.qrImageUrl);
});
