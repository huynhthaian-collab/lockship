import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { EventEmitter } from "node:events";
import { after, test } from "node:test";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { io as createSocketClient } from "socket.io-client";

const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
process.env.NODE_ENV = "test";
process.env.MONGODB_URI ??= "mongodb://127.0.0.1:27017/lockship-e2e-test";
process.env.JWT_SECRET ??= "lockship-e2e-jwt-secret-with-at-least-32-characters";
process.env.MQTT_DEVICE_TOKEN_SECRET ??= "lockship-e2e-device-secret-with-32-characters";
process.env.SMTP_HOST = "smtp.e2e.invalid";
process.env.SMTP_FROM = "LOCKSHIP E2E <noreply@e2e.invalid>";

const { default: app } = await import("../../src/app.js");
const { default: nodemailer } = await import("nodemailer");
const { default: Delivery } = await import("../../src/models/delivery.model.js");
const { default: IoTDevice } = await import("../../src/models/iot-device.model.js");
const { default: IoTEvent } = await import("../../src/models/iot-event.model.js");
const { default: Notification } = await import("../../src/models/notification.model.js");
const { default: OtpVerification } = await import("../../src/models/otp-verification.model.js");
const { default: UnlockCode } = await import("../../src/models/unlock-code.model.js");
const { default: User } = await import("../../src/models/user.model.js");
const { default: Vehicle } = await import("../../src/models/vehicle.model.js");
const { setMqttClient } = await import("../../src/services/mqtt-client.js");
const { processDeviceMessage } = await import("../../src/services/iot-device.service.js");
const { closeSocket, initializeSocket } = await import("../../src/services/socket.service.js");
const { createSimulator } = await import("../../../iot-simulator/src/simulator.js");

let server;
let baseUrl;
let simulator;
let simulatorClient;
let backendMqttClient;
let owner;
let otherOwner;
let shipper;
let otherShipper;
let vehicleId;
let deviceId;
let deviceRecordId;
let deviceConfig;
let ownerSocket;
let shipperSocket;
let otherShipperSocket;
const accountIds = [];
const issuedEmails = [];
const mqttCommands = [];
const mqttProcessingErrors = [];
const deviceProcessing = [];
const simulatorMessages = [];
const accounts = [];
const otpEmails = [];

function makeMqttClient(kind) {
    const client = new EventEmitter();
    client.connected = true;
    client.subscriptions = [];
    client.subscribe = (topic, _options, callback) => {
        client.subscriptions.push(topic);
        callback(null, []);
    };
    client.publish = (topic, payload, _options, callback) => {
        if (kind === "backend") {
            const message = JSON.parse(payload);
            mqttCommands.push({ topic, message });
            setImmediate(() => simulatorClient.emit("message", topic, Buffer.from(payload)));
        } else {
            deviceProcessing.push(
                processDeviceMessage(topic, Buffer.from(payload)).catch((error) => {
                    mqttProcessingErrors.push(error);
                }),
            );
        }
        callback(null);
    };
    client.end = (_force, _options, callback) => {
        client.connected = false;
        callback();
    };
    return client;
}

async function request(path, { token, method = "GET", body } = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
            ...(token ? {
                cookie: `lockship_session=${encodeURIComponent(token)}`,
                origin: "http://localhost:5173",
            } : {}),
            ...(body === undefined ? {} : { "content-type": "application/json" }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return {
        status: response.status,
        body: await response.json(),
        setCookie: response.headers.get("set-cookie"),
    };
}

async function expectStatus(path, expectedStatus, options = {}) {
    const result = await request(path, options);
    assert.equal(result.status, expectedStatus, JSON.stringify(result.body));
    return result.body;
}

async function registerOwner(name) {
    const email = `lockship-e2e-${runId}-${name}@example.invalid`;
    otpEmails.push(email);
    const response = await expectStatus("/api/auth/register", 201, {
        method: "POST",
        body: {
            name,
            email,
            password: "E2e-test-password-01",
            confirmPassword: "E2e-test-password-01",
            address: "10 E2E Test Street",
            role: "owner",
        },
    });
    assert.equal(response.data.token, undefined);
    const verificationEmail = issuedEmails.at(-1);
    assert.equal(verificationEmail.to, email);
    const otp = verificationEmail.text.match(/code is (\d{6})\./)?.[1];
    assert.ok(otp);
    const pendingUser = await User.findOne({ email }).select("+password +registrationPending");
    assert.equal(pendingUser.status, "inactive");
    assert.equal(pendingUser.registrationPending, true);
    assert.notEqual(pendingUser.password, "E2e-test-password-01");
    const otpRecord = await OtpVerification.findOne({ email }).select("+otpHash");
    assert.ok(otpRecord);
    assert.notEqual(otpRecord.otpHash, otp);
    assert.equal(Object.hasOwn(otpRecord.toJSON(), "otp"), false);
    await expectStatus("/api/auth/register/verify", 200, {
        method: "POST",
        body: { email, otp },
    });

    const login = await request("/api/auth/login", {
        method: "POST",
        body: { email, password: "E2e-test-password-01" },
    });
    assert.equal(login.status, 200, JSON.stringify(login.body));
    assert.equal(login.body.data.token, undefined);
    const token = login.setCookie?.match(/lockship_session=([^;]+)/)?.[1];
    assert.ok(token, "login should set a session cookie");
    assert.match(login.setCookie, /HttpOnly/i);
    assert.match(login.setCookie, /Max-Age=900/i);
    const user = await User.findOne({ email });
    accountIds.push(user.id);
    accounts.push({ email, token: decodeURIComponent(token), userId: user.id });
    const claims = jwt.decode(token);
    assert.equal(claims.exp - claims.iat, 15 * 60);
    assert.equal(login.body.data.sessionExpiresAt, claims.exp * 1000);
    await expectStatus("/api/auth/me", 200, { token: decodeURIComponent(token) });
    return { ...accounts.at(-1), role: "owner" };
}

async function createShipper(ownerAccount, name) {
    const response = await expectStatus("/api/users/shippers", 201, {
        method: "POST",
        token: ownerAccount.token,
        body: {
            name,
            email: `lockship-e2e-${runId}-${name}@example.invalid`,
            password: "E2e-test-password-01",
            address: "10 E2E Shipper Street",
        },
    });
    const user = response.data.user;
    accountIds.push(user._id);
    accounts.push({ email: user.email, token: jwt.sign(
        { ver: user.tokenVersion ?? 0 },
        process.env.JWT_SECRET,
        { subject: user._id, expiresIn: "15m" },
    ), userId: user._id });
    return { ...accounts.at(-1), role: "shipper" };
}

async function createDelivery(ownerAccount, assignedShipper = shipper, assignedVehicleId = vehicleId) {
    const created = await expectStatus("/api/deliveries", 201, {
        method: "POST",
        token: ownerAccount.token,
        body: {
            pickupAddress: "LOCKSHIP E2E warehouse",
            deliveryAddress: "LOCKSHIP E2E destination",
            description: `E2E lifecycle ${runId}`,
        },
    });
    const deliveryId = created.data.delivery._id;
    if (assignedShipper && assignedVehicleId) {
        await expectStatus(`/api/deliveries/${deliveryId}/assign`, 200, {
            method: "POST",
            token: ownerAccount.token,
            body: { shipperId: assignedShipper.userId, vehicleId: assignedVehicleId },
        });
    }
    return deliveryId;
}

async function arriveAndAuthorize(deliveryId, ownerAccount = owner, assignedShipper = shipper) {
    await expectStatus(`/api/deliveries/${deliveryId}/accept`, 200, {
        method: "POST",
        token: assignedShipper.token,
    });
    await expectStatus(`/api/deliveries/${deliveryId}/start`, 200, {
        method: "POST",
        token: assignedShipper.token,
    });
    await expectStatus(`/api/deliveries/${deliveryId}/arrive`, 200, {
        method: "POST",
        token: assignedShipper.token,
    });
    await expectStatus(`/api/deliveries/${deliveryId}/authorize`, 200, {
        method: "POST",
        token: ownerAccount.token,
    });
    const email = issuedEmails.at(-1);
    assert.ok(email, "authorization should email an unlock code");
    assert.equal(email.to, assignedShipper.email);
    const code = email.text.match(/code is (\d{6})\./)?.[1];
    assert.ok(code, "email should contain the six-digit unlock code");
    return code;
}

function socketEvent(socket, eventName, timeoutMs = 5000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            socket.off(eventName, onEvent);
            reject(new Error(`Timed out waiting for Socket.IO event "${eventName}".`));
        }, timeoutMs);
        const onEvent = (payload) => {
            clearTimeout(timer);
            resolve(payload);
        };
        socket.once(eventName, onEvent);
    });
}

async function connectSocket(token) {
    const socket = createSocketClient(baseUrl, {
        extraHeaders: { Cookie: `lockship_session=${encodeURIComponent(token)}` },
        transports: ["websocket"],
        reconnection: false,
        timeout: 3000,
    });
    await new Promise((resolve, reject) => {
        socket.once("connect", resolve);
        socket.once("connect_error", reject);
    });
    return socket;
}

async function waitFor(predicate, description, timeoutMs = 5000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (await predicate()) {
            return;
        }
        await new Promise((resolve) => setTimeout(resolve, 20));
    }
    throw new Error(`Timed out waiting for ${description}.`);
}

test("Owner-to-shipper delivery completes only after the simulator confirms MQTT unlock", async (t) => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 3000 });
    } catch (error) {
        t.skip(`MongoDB is required for end-to-end tests: ${error.message}`);
        return;
    }

    const originalCreateTransport = nodemailer.createTransport;
    nodemailer.createTransport = () => ({
        sendMail: async (mail) => {
            issuedEmails.push(mail);
            return { accepted: [mail.to] };
        },
    });

    try {
        server = createServer(app);
        initializeSocket(server);
        server.listen(0, "127.0.0.1");
        await once(server, "listening");
        baseUrl = `http://127.0.0.1:${server.address().port}`;

        owner = await registerOwner("owner-a");
        otherOwner = await registerOwner("owner-b");
        shipper = await createShipper(owner, "shipper-a");
        otherShipper = await createShipper(otherOwner, "shipper-b");

        const vehicle = await expectStatus("/api/vehicles", 201, {
            method: "POST",
            token: owner.token,
            body: {
                plateNumber: `E2E-${runId.slice(-8)}`,
                type: "van",
                model: "Simulator Van",
            },
        });
        vehicleId = vehicle.data.vehicle._id;

        const device = await expectStatus("/api/iot", 201, {
            method: "POST",
            token: owner.token,
            body: { deviceId: `lockship-e2e-${runId}`, vehicleId },
        });
        deviceId = device.data.device.deviceId;
        deviceRecordId = device.data.device._id;
        assert.equal(device.data.device.credentialId, undefined);
        assert.equal(typeof device.data.deviceToken, "string");

        ownerSocket = await connectSocket(owner.token);
        shipperSocket = await connectSocket(shipper.token);
        otherShipperSocket = await connectSocket(otherShipper.token);

        backendMqttClient = makeMqttClient("backend");
        simulatorClient = makeMqttClient("simulator");
        setMqttClient(backendMqttClient);
        simulatorClient.on("message", (topic, payload) => {
            if (topic.endsWith("/command")) {
                simulatorMessages.push({ topic, message: JSON.parse(payload.toString("utf8")) });
            }
        });
        deviceConfig = {
            deviceId,
            deviceToken: device.data.deviceToken,
            simulateUnlockFailure: false,
            unlockFailureRate: 0,
            statusIntervalMs: 3600000,
            unlockDelayMs: 0,
            firmwareVersion: "e2e-1.0.0",
            batteryLevel: 97,
        };
        simulator = createSimulator({
            config: deviceConfig,
            client: simulatorClient,
            logger: { info() {}, warn() {}, error() {} },
        });
        simulator.start();
        simulatorClient.emit("connect");
        await waitFor(async () => (await IoTDevice.findById(deviceRecordId))?.status === "online", "simulator online status");

        await t.test("registration OTP expires, limits attempts, resends, and is single-use", async () => {
            const email = `lockship-e2e-${runId}-otp-attempts@example.invalid`;
            otpEmails.push(email);
            const registration = await expectStatus("/api/auth/register", 201, {
                method: "POST",
                body: {
                    name: "OTP Test User",
                    email,
                    password: "Otp-test-password-01",
                    confirmPassword: "Otp-test-password-01",
                    address: "10 OTP Test Street",
                    role: "owner",
                },
            });
            assert.equal(registration.data.token, undefined);
            const firstOtp = issuedEmails.at(-1).text.match(/code is (\d{6})\./)?.[1];
            assert.ok(firstOtp);
            const pendingUser = await User.findOne({ email }).select("+registrationPending +password");
            accountIds.push(pendingUser.id);
            assert.equal(pendingUser.status, "inactive");
            assert.equal(pendingUser.registrationPending, true);
            assert.notEqual(pendingUser.password, "Otp-test-password-01");
            assert.equal((await request("/api/auth/login", {
                method: "POST",
                body: { email, password: "Otp-test-password-01" },
            })).status, 401);
            const firstRecord = await OtpVerification.findOne({ email }).select("+otpHash");
            assert.ok(firstRecord);
            assert.notEqual(firstRecord.otpHash, firstOtp);
            assert.equal(Object.hasOwn(firstRecord.toJSON(), "otp"), false);

            const wrongOtp = firstOtp === "000000" ? "000001" : "000000";
            for (let attempt = 1; attempt <= 5; attempt += 1) {
                const invalid = await request("/api/auth/register/verify", {
                    method: "POST",
                    body: { email, otp: wrongOtp },
                });
                assert.equal(invalid.status, attempt === 5 ? 429 : 400);
                assert.equal(invalid.body.data.errorCode, attempt === 5 ? "OTP_MAX_ATTEMPTS" : "INVALID_OTP");
            }
            const cooldown = await request("/api/auth/register/resend-otp", {
                method: "POST",
                body: { email },
            });
            assert.equal(cooldown.status, 429);

            await OtpVerification.updateOne(
                { email, purpose: "REGISTER" },
                { $set: { resendAvailableAt: new Date(Date.now() - 1000) } },
            );
            await expectStatus("/api/auth/register/resend-otp", 200, { method: "POST", body: { email } });
            const secondOtp = issuedEmails.at(-1).text.match(/code is (\d{6})\./)?.[1];
            assert.ok(secondOtp);
            assert.notEqual(secondOtp, firstOtp);
            const staleOtp = await request("/api/auth/register/verify", {
                method: "POST",
                body: { email, otp: firstOtp },
            });
            assert.equal(staleOtp.status, 400);
            assert.equal(staleOtp.body.data.errorCode, "INVALID_OTP");

            await expectStatus("/api/auth/register/verify", 200, {
                method: "POST",
                body: { email, otp: secondOtp },
            });
            const reusedOtp = await request("/api/auth/register/verify", {
                method: "POST",
                body: { email, otp: secondOtp },
            });
            assert.equal(reusedOtp.status, 400);
            assert.equal(reusedOtp.body.data.errorCode, "OTP_EXPIRED");
            assert.equal((await User.findById(pendingUser.id)).status, "active");

            const expiredEmail = `lockship-e2e-${runId}-otp-expired@example.invalid`;
            otpEmails.push(expiredEmail);
            await expectStatus("/api/auth/register", 201, {
                method: "POST",
                body: {
                    name: "Expired OTP User",
                    email: expiredEmail,
                    password: "Otp-test-password-01",
                    confirmPassword: "Otp-test-password-01",
                    address: "10 Expired OTP Street",
                    role: "owner",
                },
            });
            const expiredOtp = issuedEmails.at(-1).text.match(/code is (\d{6})\./)?.[1];
            const expiredUser = await User.findOne({ email: expiredEmail });
            accountIds.push(expiredUser.id);
            await OtpVerification.updateOne(
                { email: expiredEmail, purpose: "REGISTER" },
                { $set: { expiresAt: new Date(Date.now() - 1000) } },
            );
            const expiredResult = await request("/api/auth/register/verify", {
                method: "POST",
                body: { email: expiredEmail, otp: expiredOtp },
            });
            assert.equal(expiredResult.status, 400);
            assert.equal(expiredResult.body.data.errorCode, "OTP_EXPIRED");
        });

        await t.test("runs the complete authorized delivery and physical unlock lifecycle", async () => {
            const deliveryId = await createDelivery(owner);
            const arrivalEvent = socketEvent(ownerSocket, "delivery:arrived");

            await expectStatus(`/api/deliveries/${deliveryId}/accept`, 200, {
                method: "POST",
                token: shipper.token,
            });
            await expectStatus(`/api/deliveries/${deliveryId}/start`, 200, {
                method: "POST",
                token: shipper.token,
            });
            const arrived = await expectStatus(`/api/deliveries/${deliveryId}/arrive`, 200, {
                method: "POST",
                token: shipper.token,
            });
            assert.equal(arrived.data.delivery.status, "arrived");
            const arrivalPayload = await arrivalEvent;
            assert.equal(arrivalPayload.deliveryId, deliveryId);
            assert.ok(await Notification.exists({ userId: owner.userId, deliveryId }));

            const codeIssuedEvent = socketEvent(shipperSocket, "unlock-code:created");
            const codeNotificationEvent = socketEvent(shipperSocket, "notification:new");
            let otherShipperReceivedCodeEvent = false;
            let otherShipperReceivedNotification = false;
            const recordUnrelatedCodeEvent = () => { otherShipperReceivedCodeEvent = true; };
            const recordUnrelatedNotification = () => { otherShipperReceivedNotification = true; };
            otherShipperSocket.on("unlock-code:created", recordUnrelatedCodeEvent);
            otherShipperSocket.on("notification:new", recordUnrelatedNotification);
            const authorization = await expectStatus(`/api/deliveries/${deliveryId}/authorize`, 200, {
                method: "POST",
                token: owner.token,
            });
            const codeEvent = await codeIssuedEvent;
            const codeNotification = await codeNotificationEvent;
            const authorizationEmail = issuedEmails.at(-1);
            assert.equal(authorizationEmail.to, shipper.email);
            const code = authorizationEmail.text.match(/code is (\d{6})\./)?.[1];
            assert.ok(code);
            assert.equal(authorization.data.codeExpiresAt, codeEvent.expiresAt);
            assert.equal(codeEvent.deliveryId, deliveryId);
            assert.equal(codeEvent.status, "active");
            assert.equal(Object.hasOwn(codeEvent, "code"), false);
            assert.equal(codeNotification.type, "unlock_code_issued");
            assert.equal(codeNotification.deliveryId, deliveryId);
            assert.equal(codeNotification.message.includes(code), false);
            await new Promise((resolve) => setTimeout(resolve, 30));
            otherShipperSocket.off("unlock-code:created", recordUnrelatedCodeEvent);
            otherShipperSocket.off("notification:new", recordUnrelatedNotification);
            assert.equal(otherShipperReceivedCodeEvent, false);
            assert.equal(otherShipperReceivedNotification, false);
            assert.ok(await Notification.exists({
                userId: shipper.userId,
                type: "unlock_code_issued",
                deliveryId,
            }));

            const fallbackCode = await expectStatus(`/api/deliveries/${deliveryId}/unlock-code`, 200, {
                token: shipper.token,
            });
            assert.equal(fallbackCode.data.unlockCode.code, code);
            assert.equal(fallbackCode.data.unlockCode.expiresAt, authorization.data.codeExpiresAt);
            await expectStatus(`/api/deliveries/${deliveryId}/unlock-code`, 404, {
                token: otherShipper.token,
            });
            await expectStatus(`/api/deliveries/${deliveryId}/unlock-code`, 403, {
                token: owner.token,
            });

            const persistedCode = await UnlockCode.findOne({ deliveryId }).select("+codeHash +encryptedCode");
            assert.ok(persistedCode);
            assert.notEqual(persistedCode.codeHash, code);
            assert.notEqual(persistedCode.encryptedCode, code);
            assert.equal(Object.hasOwn(persistedCode.toJSON(), "code"), false);

            const unlockSuccess = socketEvent(shipperSocket, "unlock:success");
            const unlockResponse = await expectStatus(`/api/deliveries/${deliveryId}/unlock`, 200, {
                method: "POST",
                token: shipper.token,
                body: { code },
            });
            assert.equal(unlockResponse.data.unlockCommandPending, true);
            await expectStatus(`/api/deliveries/${deliveryId}/unlock-code`, 409, {
                token: shipper.token,
            });
            const successPayload = await unlockSuccess;
            assert.equal(successPayload.deliveryId, deliveryId);
            assert.equal(successPayload.status, "succeeded");
            assert.equal(successPayload.lockStatus, "unlocked");
            assert.ok(mqttCommands.some(({ topic, message }) =>
                topic === `lockship/device/${deviceId}/command`
                && message.command === "UNLOCK"
                && message.deliveryId === deliveryId));
            const commandRecord = await IoTEvent.findOne({
                deviceId,
                type: "unlock_command_completed",
                "payload.deliveryId": deliveryId,
            });
            assert.equal(commandRecord.payload.ownerId.toString(), owner.userId);
            assert.ok(simulatorMessages.some(({ topic, message }) =>
                topic === `lockship/device/${deviceId}/command`
                && message.command === "UNLOCK"
                && message.deliveryId === deliveryId));
            assert.equal(Object.hasOwn(simulatorMessages.at(-1).message, "code"), false);

            await waitFor(async () => {
                const [savedDelivery, savedDevice] = await Promise.all([
                    Delivery.findById(deliveryId),
                    IoTDevice.findById(deviceRecordId),
                ]);
                return savedDelivery?.unlockStatus === "succeeded" && savedDevice?.lockStatus === "unlocked";
            }, "backend unlock success and device lock status");

            const duplicateCode = await request(`/api/deliveries/${deliveryId}/unlock`, {
                method: "POST",
                token: shipper.token,
                body: { code },
            });
            assert.equal(duplicateCode.status, 409);
            assert.equal(duplicateCode.body.data.errorCode, "CODE_ALREADY_USED");

            const completed = await expectStatus(`/api/deliveries/${deliveryId}/complete`, 200, {
                method: "POST",
                token: shipper.token,
            });
            assert.equal(completed.data.delivery.status, "completed");
            assert.equal(completed.data.delivery.unlockStatus, "succeeded");
        });

        await t.test("offline shipper retrieves the active code and notification after reconnecting", async () => {
            const deliveryId = await createDelivery(owner);
            await expectStatus(`/api/deliveries/${deliveryId}/accept`, 200, {
                method: "POST",
                token: shipper.token,
            });
            await expectStatus(`/api/deliveries/${deliveryId}/start`, 200, {
                method: "POST",
                token: shipper.token,
            });
            await expectStatus(`/api/deliveries/${deliveryId}/arrive`, 200, {
                method: "POST",
                token: shipper.token,
            });

            shipperSocket.disconnect();
            shipperSocket = null;
            await expectStatus(`/api/deliveries/${deliveryId}/authorize`, 200, {
                method: "POST",
                token: owner.token,
            });
            const emailCode = issuedEmails.at(-1).text.match(/code is (\d{6})\./)?.[1];
            assert.ok(emailCode);

            shipperSocket = await connectSocket(shipper.token);
            const activeCode = await expectStatus(`/api/deliveries/${deliveryId}/unlock-code`, 200, {
                token: shipper.token,
            });
            assert.equal(activeCode.data.unlockCode.code, emailCode);
            const notifications = await expectStatus("/api/notifications", 200, {
                token: shipper.token,
            });
            assert.ok(notifications.data.notifications.some((item) =>
                item.type === "unlock_code_issued" && item.deliveryId === deliveryId));
        });

        await t.test("rejects unauthorized users, wrong shippers, and cross-owner delivery access", async () => {
            const ownerBDeliveryId = await createDelivery(otherOwner, null, null);
            const assignedDeliveryId = await createDelivery(owner);

            await expectStatus(`/api/deliveries/${assignedDeliveryId}/accept`, 401, { method: "POST" });
            await expectStatus(`/api/deliveries/${assignedDeliveryId}/accept`, 403, {
                method: "POST",
                token: owner.token,
            });
            await expectStatus(`/api/deliveries/${assignedDeliveryId}/authorize`, 403, {
                method: "POST",
                token: shipper.token,
            });
            await expectStatus(`/api/deliveries/${assignedDeliveryId}`, 404, {
                token: otherShipper.token,
            });
            await expectStatus(`/api/deliveries/${assignedDeliveryId}/accept`, 404, {
                method: "POST",
                token: otherShipper.token,
            });
            await expectStatus(`/api/deliveries/${ownerBDeliveryId}`, 404, {
                token: owner.token,
            });
            await expectStatus(`/api/deliveries/${ownerBDeliveryId}/authorize`, 404, {
                method: "POST",
                token: owner.token,
            });
            await expectStatus(`/api/deliveries/${ownerBDeliveryId}`, 200, {
                token: otherOwner.token,
            });
        });

        await t.test("rejects delivery actions made from the wrong status", async () => {
            const deliveryId = await createDelivery(owner);
            await expectStatus(`/api/deliveries/${deliveryId}/start`, 409, {
                method: "POST",
                token: shipper.token,
            });
            await expectStatus(`/api/deliveries/${deliveryId}/arrive`, 409, {
                method: "POST",
                token: shipper.token,
            });
            await expectStatus(`/api/deliveries/${deliveryId}/authorize`, 409, {
                method: "POST",
                token: owner.token,
            });
            await expectStatus(`/api/deliveries/${deliveryId}/complete`, 409, {
                method: "POST",
                token: shipper.token,
            });
        });

        await t.test("rejects invalid codes and locks out after too many attempts", async () => {
            const deliveryId = await createDelivery(owner);
            const code = await arriveAndAuthorize(deliveryId);
            const wrongCode = code === "000000" ? "000001" : "000000";
            const commandCount = mqttCommands.length;

            for (let attempt = 0; attempt < 5; attempt += 1) {
                const response = await request(`/api/deliveries/${deliveryId}/unlock`, {
                    method: "POST",
                    token: shipper.token,
                    body: { code: wrongCode },
                });
                assert.equal(response.status, 401);
                assert.equal(response.body.data.errorCode, "INVALID_CODE");
            }

            const lockedOut = await request(`/api/deliveries/${deliveryId}/unlock`, {
                method: "POST",
                token: shipper.token,
                body: { code },
            });
            assert.equal(lockedOut.status, 429);
            assert.equal(lockedOut.body.data.errorCode, "MAX_ATTEMPTS");
            assert.equal(mqttCommands.length, commandCount);
        });

        await t.test("rejects expired unlock codes", async () => {
            const deliveryId = await createDelivery(owner);
            const code = await arriveAndAuthorize(deliveryId);
            await UnlockCode.updateOne(
                { deliveryId },
                { $set: { expiresAt: new Date(Date.now() - 1000) } },
            );

            await expectStatus(`/api/deliveries/${deliveryId}/unlock-code`, 410, {
                token: shipper.token,
            });
            const response = await request(`/api/deliveries/${deliveryId}/unlock`, {
                method: "POST",
                token: shipper.token,
                body: { code },
            });
            assert.equal(response.status, 410);
            assert.equal(response.body.data.errorCode, "CODE_EXPIRED");
        });

        await t.test("does not consume a valid code while the IoT device is offline", async () => {
            const deliveryId = await createDelivery(owner);
            const code = await arriveAndAuthorize(deliveryId);
            await IoTDevice.updateOne({ _id: deviceRecordId }, { $set: { status: "offline" } });

            const response = await request(`/api/deliveries/${deliveryId}/unlock`, {
                method: "POST",
                token: shipper.token,
                body: { code },
            });
            assert.equal(response.status, 503);
            assert.equal(response.body.data.errorCode, "DEVICE_OFFLINE");
            assert.equal((await UnlockCode.findOne({ deliveryId })).used, false);

            await IoTDevice.updateOne({ _id: deviceRecordId }, { $set: { status: "online" } });
        });

        await t.test("records device unlock failure and keeps delivery incomplete", async () => {
            const deliveryId = await createDelivery(owner);
            const code = await arriveAndAuthorize(deliveryId);
            deviceConfig.simulateUnlockFailure = true;
            const unlockFailed = socketEvent(shipperSocket, "unlock:failed");

            const accepted = await expectStatus(`/api/deliveries/${deliveryId}/unlock`, 200, {
                method: "POST",
                token: shipper.token,
                body: { code },
            });
            const failurePayload = await unlockFailed;
            assert.equal(failurePayload.deliveryId, deliveryId);
            assert.equal(failurePayload.status, "failed");
            assert.equal(failurePayload.errorCode, "DEVICE_UNLOCK_FAILED");
            await waitFor(async () => (await Delivery.findById(deliveryId))?.unlockStatus === "failed", "failed unlock result");

            const completion = await request(`/api/deliveries/${deliveryId}/complete`, {
                method: "POST",
                token: shipper.token,
            });
            assert.equal(completion.status, 409);
            assert.equal(completion.body.data.errorCode, "DEVICE_UNLOCK_FAILED");
            assert.equal(accepted.data.unlockCommandPending, true);
            assert.equal((await IoTDevice.findById(deviceRecordId)).lockStatus, "locked");
        });

        await t.test("forgot-password OTP resets the password once and invalidates previous sessions", async () => {
            const email = owner.email;
            const genericResponse = await expectStatus("/api/auth/forgot-password", 200, {
                method: "POST",
                body: { email: `unknown-${runId}@example.invalid` },
            });
            const workingTransport = nodemailer.createTransport;
            nodemailer.createTransport = () => ({
                sendMail: async () => { throw new Error("SMTP test failure"); },
            });
            const failedDelivery = await expectStatus("/api/auth/forgot-password", 200, {
                method: "POST",
                body: { email },
            });
            assert.equal(failedDelivery.message, genericResponse.message);
            nodemailer.createTransport = workingTransport;
            const knownResponse = await expectStatus("/api/auth/forgot-password", 200, {
                method: "POST",
                body: { email },
            });
            assert.equal(knownResponse.message, genericResponse.message);
            const otp = issuedEmails.at(-1).text.match(/code is (\d{6})\./)?.[1];
            assert.ok(otp);
            const invalidOtp = await request("/api/auth/forgot-password/verify", {
                method: "POST",
                body: { email, otp: otp === "000000" ? "000001" : "000000" },
            });
            assert.equal(invalidOtp.status, 400);
            assert.equal(invalidOtp.body.data.errorCode, "INVALID_OTP");

            const verified = await expectStatus("/api/auth/forgot-password/verify", 200, {
                method: "POST",
                body: { email, otp },
            });
            assert.match(verified.data.resetToken, /^[a-f0-9]{64}$/);
            const userBeforeReset = await User.findOne({ email }).select("+passwordResetTokenHash +password");
            assert.notEqual(userBeforeReset.passwordResetTokenHash, verified.data.resetToken);
            await User.updateOne(
                { email },
                { $set: { passwordResetExpiresAt: new Date(Date.now() - 1000) } },
            );
            const expiredReset = await request("/api/auth/reset-password", {
                method: "POST",
                body: { resetToken: verified.data.resetToken, newPassword: "New-test-password-02" },
            });
            assert.equal(expiredReset.status, 400);

            await OtpVerification.updateOne(
                { email, purpose: "FORGOT_PASSWORD" },
                { $set: { resendAvailableAt: new Date(Date.now() - 1000) } },
            );
            await expectStatus("/api/auth/forgot-password/resend-otp", 200, {
                method: "POST",
                body: { email },
            });
            const secondOtp = issuedEmails.at(-1).text.match(/code is (\d{6})\./)?.[1];
            assert.ok(secondOtp);
            const verifiedAgain = await expectStatus("/api/auth/forgot-password/verify", 200, {
                method: "POST",
                body: { email, otp: secondOtp },
            });
            const reset = await expectStatus("/api/auth/reset-password", 200, {
                method: "POST",
                body: { resetToken: verifiedAgain.data.resetToken, newPassword: "New-test-password-02" },
            });
            assert.equal(reset.success, true);
            const tokenReuse = await request("/api/auth/reset-password", {
                method: "POST",
                body: { resetToken: verifiedAgain.data.resetToken, newPassword: "New-test-password-03" },
            });
            assert.equal(tokenReuse.status, 400);
            assert.equal((await request("/api/auth/me", { token: owner.token })).status, 401);
            assert.equal((await request("/api/auth/login", {
                method: "POST",
                body: { email, password: "E2e-test-password-01" },
            })).status, 401);
            const newLogin = await request("/api/auth/login", {
                method: "POST",
                body: { email, password: "New-test-password-02" },
            });
            assert.equal(newLogin.status, 200);
            assert.equal(newLogin.body.data.token, undefined);
            const newSessionToken = newLogin.setCookie?.match(/lockship_session=([^;]+)/)?.[1];
            assert.ok(newSessionToken);
            const logout = await request("/api/auth/logout", { method: "POST", token: decodeURIComponent(newSessionToken) });
            assert.equal(logout.status, 200);
            assert.match(logout.setCookie, /Expires=.*1970/i);
            assert.equal((await request("/api/auth/me", { token: decodeURIComponent(newSessionToken) })).status, 401);
        });

        assert.deepEqual(mqttProcessingErrors, []);
        assert.ok(await IoTEvent.exists({ deviceId, type: "unlock_succeeded" }));
        assert.ok(await IoTEvent.exists({ deviceId, type: "unlock_failed" }));
    } finally {
        ownerSocket?.disconnect();
        shipperSocket?.disconnect();
        otherShipperSocket?.disconnect();
        if (simulator) {
            await simulator.stop();
            await Promise.all(deviceProcessing);
        }
        setMqttClient(null);
        await closeSocket();
        if (server?.listening) {
            server.close();
            server.closeAllConnections();
            await once(server, "close");
        }

        const userObjectIds = accountIds.map((id) => new mongoose.Types.ObjectId(id));
        if (userObjectIds.length > 0) {
            await Promise.all([
                UnlockCode.deleteMany({ ownerId: { $in: userObjectIds } }),
                OtpVerification.deleteMany({ email: { $in: otpEmails } }),
                IoTEvent.deleteMany({ ownerId: { $in: userObjectIds } }),
                Notification.deleteMany({ userId: { $in: userObjectIds } }),
                Delivery.deleteMany({ ownerId: { $in: userObjectIds } }),
                IoTDevice.deleteMany({ ownerId: { $in: userObjectIds } }),
                Vehicle.deleteMany({ ownerId: { $in: userObjectIds } }),
                User.deleteMany({ _id: { $in: userObjectIds } }),
            ]);
        }
        nodemailer.createTransport = originalCreateTransport;
        await mongoose.disconnect();
    }
});

after(async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
});
