import { createCipheriv, createDecipheriv, createHash, randomBytes, randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import Delivery from "../models/delivery.model.js";
import UnlockCode from "../models/unlock-code.model.js";
import AppError from "../utils/app-error.js";
import { sendUnlockCodeEmail } from "./email.service.js";
import { assertVerifiedUnlockReady, publishVerifiedUnlock } from "./iot-device.service.js";
import { emitToUsers } from "./socket.service.js";

function createSixDigitCode() {
    return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function getEncryptionKey() {
    return createHash("sha256").update(`lockship:unlock-code:${env.UNLOCK_CODE_ENCRYPTION_KEY}`).digest();
}

function encryptCode(code) {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
    const ciphertext = Buffer.concat([cipher.update(code, "utf8"), cipher.final()]);
    return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString("base64url")).join(".");
}

function decryptCode(encryptedCode) {
    const [encodedIv, encodedTag, encodedCiphertext] = encryptedCode.split(".");
    const decipher = createDecipheriv(
        "aes-256-gcm",
        getEncryptionKey(),
        Buffer.from(encodedIv, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
    return Buffer.concat([
        decipher.update(Buffer.from(encodedCiphertext, "base64url")),
        decipher.final(),
    ]).toString("utf8");
}

function getCodeStateError(unlockCode, now) {
    if (!unlockCode) {
        return new AppError("Unlock code is invalid.", 401, null, "INVALID_CODE");
    }
    if (unlockCode.used) {
        return new AppError("Unlock code has already been used.", 409, null, "CODE_ALREADY_USED");
    }
    if (unlockCode.expiresAt <= now) {
        return new AppError("Unlock code has expired.", 410, null, "CODE_EXPIRED");
    }
    if (unlockCode.attempts >= env.UNLOCK_CODE_MAX_ATTEMPTS) {
        return new AppError("Maximum unlock code attempts reached.", 429, null, "MAX_ATTEMPTS");
    }

    return null;
}

async function invalidateCodeIfCurrent(deliveryId, codeHash) {
    await UnlockCode.updateOne(
        { deliveryId, codeHash, used: false },
        { $set: { used: true, usedAt: new Date() } },
    );
}

export async function issueUnlockCode(delivery, shipperEmail, sendEmail = sendUnlockCodeEmail) {
    const code = createSixDigitCode();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + env.UNLOCK_CODE_TTL_MINUTES * 60 * 1000);
    const codeHash = await bcrypt.hash(code, env.BCRYPT_SALT_ROUNDS);
    const codeRecord = {
        deliveryId: delivery._id,
        ownerId: delivery.ownerId,
        shipperId: delivery.shipperId,
        codeHash,
        encryptedCode: encryptCode(code),
        expiresAt,
        used: false,
        attempts: 0,
        usedAt: null,
    };

    try {
        await UnlockCode.findOneAndUpdate(
            { deliveryId: delivery._id },
            { $set: codeRecord },
            { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
        );
    } catch (error) {
        if (error.code !== 11000) {
            throw error;
        }
        await UnlockCode.findOneAndUpdate(
            { deliveryId: delivery._id },
            { $set: codeRecord },
            { new: true, runValidators: true },
        );
    }

    try {
        await sendEmail(shipperEmail, code, expiresAt);
    } catch (error) {
        await invalidateCodeIfCurrent(delivery._id, codeHash);
        throw error;
    }

    return { expiresAt };
}

export async function getActiveUnlockCode(shipperId, deliveryId) {
    const delivery = await Delivery.findOne({ _id: deliveryId, shipperId });
    if (!delivery) {
        throw new AppError("Delivery was not found.", 404);
    }
    if (delivery.status !== "authorized") {
        throw new AppError("Delivery is not authorized for an unlock code.", 409, null, "DELIVERY_NOT_AUTHORIZED");
    }

    const unlockCode = await UnlockCode.findOne({
        deliveryId,
        ownerId: delivery.ownerId,
        shipperId,
    }).select("+encryptedCode +codeHash");
    const now = new Date();
    const stateError = getCodeStateError(unlockCode, now);
    if (stateError) {
        throw stateError;
    }
    if (!unlockCode.encryptedCode) {
        throw new AppError("The active unlock code must be resent by the owner.", 410, null, "CODE_UNAVAILABLE");
    }

    return {
        deliveryId: delivery.id,
        code: decryptCode(unlockCode.encryptedCode),
        expiresAt: unlockCode.expiresAt,
    };
}

export async function verifyUnlockCode(
    shipperId,
    deliveryId,
    code,
    { assertReady = assertVerifiedUnlockReady, publishUnlock = publishVerifiedUnlock } = {},
) {
    const delivery = await Delivery.findOne({ _id: deliveryId, shipperId });
    if (!delivery) {
        throw new AppError("Delivery was not found.", 404);
    }
    if (delivery.status !== "authorized") {
        throw new AppError("Delivery must be authorized before its code can be used.", 409, null, "DELIVERY_NOT_AUTHORIZED");
    }

    const unlockCode = await UnlockCode.findOne({
        deliveryId,
        ownerId: delivery.ownerId,
        shipperId,
    }).select("+codeHash");
    const now = new Date();
    const stateError = getCodeStateError(unlockCode, now);
    if (stateError) {
        if (unlockCode && !unlockCode.used && unlockCode.expiresAt <= now) {
            await invalidateCodeIfCurrent(deliveryId, unlockCode.codeHash);
        }
        throw stateError;
    }

    const codeHash = unlockCode.codeHash;
    const matches = await bcrypt.compare(code, codeHash);
    if (!matches) {
        const attemptResult = await UnlockCode.updateOne(
            {
                _id: unlockCode._id,
                codeHash,
                used: false,
                attempts: { $lt: env.UNLOCK_CODE_MAX_ATTEMPTS },
                expiresAt: { $gt: now },
            },
            { $inc: { attempts: 1 } },
        );
        if (attemptResult.modifiedCount !== 1) {
            const currentCode = await UnlockCode.findById(unlockCode._id);
            const currentStateError = getCodeStateError(currentCode, new Date());
            if (currentStateError) {
                throw currentStateError;
            }
        }

        throw new AppError("Unlock code is incorrect.", 401, null, "INVALID_CODE");
    }

    try {
        await assertReady(delivery.vehicleId, delivery.ownerId);
    } catch (error) {
        if (error.errorCode === "DEVICE_OFFLINE") {
            emitToUsers([shipperId, delivery.ownerId], "unlock:failed", {
                deliveryId: delivery.id,
                status: "failed",
                errorCode: "DEVICE_OFFLINE",
            });
        }
        throw error;
    }

    const usedCode = await UnlockCode.findOneAndUpdate(
        {
            _id: unlockCode._id,
            codeHash,
            used: false,
            attempts: { $lt: env.UNLOCK_CODE_MAX_ATTEMPTS },
            expiresAt: { $gt: now },
        },
        { $set: { used: true, usedAt: now } },
        { new: true },
    );
    if (!usedCode) {
        const currentCode = await UnlockCode.findById(unlockCode._id);
        throw getCodeStateError(currentCode, new Date())
        ?? new AppError("Unlock code could not be used.", 409);
    }

    const pendingDelivery = await Delivery.findOneAndUpdate(
        {
            _id: deliveryId,
            ownerId: delivery.ownerId,
            shipperId,
            status: "authorized",
        },
        { $set: { unlockStatus: "pending" } },
        { new: true, runValidators: true },
    );
    if (!pendingDelivery) {
        throw new AppError("Delivery authorization changed before unlock.", 409, null, "DELIVERY_NOT_AUTHORIZED");
    }

    const command = await publishUnlock(delivery.vehicleId, delivery.ownerId, delivery.id);
    emitToUsers([shipperId, delivery.ownerId], "unlock:requested", {
        deliveryId: delivery.id,
        requestId: command.requestId,
        status: "pending",
    });
    return {
        deliveryId: delivery.id,
        verified: true,
        unlockCommandPending: true,
        requestId: command.requestId,
        usedAt: usedCode.usedAt,
    };
}