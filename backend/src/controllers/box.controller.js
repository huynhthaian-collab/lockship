import mongoose from "mongoose";
import IoTDevice from "../models/iot-device.model.js";
import AppError from "../utils/app-error.js";

function buildQrMetadata(boxId, origin) {
    const baseHost = origin && !origin.includes("localhost")
        ? origin.replace(/\/$/, "")
        : "https://lockship-gamma.vercel.app";
    const qrUrl = `${baseHost}/public/box-scan/${boxId}`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(qrUrl)}`;
    return { qrUrl, qrImageUrl };
}

/**
 * List all boxes with QR code metadata (Admin only)
 */
export async function listBoxes(req, res, next) {
    try {
        const devices = await IoTDevice.find().populate("ownerId", "name email").sort({ createdAt: -1 });
        const boxes = devices.map((device) => {
            const { qrUrl, qrImageUrl } = buildQrMetadata(device.deviceId, req.get("origin"));
            return {
                id: device._id,
                boxId: device.deviceId,
                name: `Tủ khóa thông minh #${device.deviceId}`,
                status: device.status,
                lockStatus: device.lockStatus,
                battery: device.battery,
                owner: device.ownerId,
                qrUrl,
                qrImageUrl,
                lastSeen: device.lastSeen,
            };
        });

        res.status(200).json({
            success: true,
            data: { boxes },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Create a new Box and generate its QR code (Admin only)
 */
export async function createBox(req, res, next) {
    try {
        const { boxId, name, address, ownerId, vehicleId } = req.body;
        const cleanBoxId = String(boxId || "").trim();

        if (!cleanBoxId || cleanBoxId.length < 3) {
            throw new AppError("Mã tủ khóa (boxId) là bắt buộc và tối thiểu 3 ký tự.", 422);
        }

        const { qrUrl, qrImageUrl } = buildQrMetadata(cleanBoxId, req.get("origin"));

        // If vehicleId and ownerId are provided, also persist as IoTDevice
        let createdDevice = null;
        if (ownerId && mongoose.isValidObjectId(ownerId) && vehicleId && mongoose.isValidObjectId(vehicleId)) {
            createdDevice = await IoTDevice.create({
                deviceId: cleanBoxId,
                ownerId,
                vehicleId,
                status: "offline",
                lockStatus: "locked",
            });
        }

        res.status(201).json({
            success: true,
            message: "Tạo tủ khóa và cấp phát mã QR thành công.",
            data: {
                box: {
                    id: createdDevice?._id || cleanBoxId,
                    boxId: cleanBoxId,
                    name: name || `Lockship Box #${cleanBoxId}`,
                    address: address || "Vị trí lắp đặt tủ Lockship",
                    qrUrl,
                    qrImageUrl,
                    generatedAt: new Date(),
                    generatedBy: req.user.id,
                },
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Generate or re-issue a QR code for a Box (Admin only)
 */
export async function generateBoxQr(req, res, next) {
    try {
        const { id } = req.params;
        let cleanBoxId = String(id || "").trim();

        // Check if id is a MongoDB ObjectId in IoTDevice
        if (mongoose.isValidObjectId(cleanBoxId)) {
            const device = await IoTDevice.findById(cleanBoxId);
            if (device) {
                cleanBoxId = device.deviceId;
            }
        }

        if (!cleanBoxId) {
            throw new AppError("Mã tủ khóa không hợp lệ.", 400);
        }

        const { qrUrl, qrImageUrl } = buildQrMetadata(cleanBoxId, req.get("origin"));

        res.status(200).json({
            success: true,
            message: "Cấp phát mã QR cho tủ khóa thành công.",
            data: {
                boxId: cleanBoxId,
                qrUrl,
                qrImageUrl,
                generatedAt: new Date(),
                generatedBy: req.user.name || "Admin",
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get QR details of a Box (Admin only)
 */
export async function getBoxQr(req, res, next) {
    try {
        const { id } = req.params;
        let cleanBoxId = String(id || "").trim();

        if (mongoose.isValidObjectId(cleanBoxId)) {
            const device = await IoTDevice.findById(cleanBoxId);
            if (device) {
                cleanBoxId = device.deviceId;
            }
        }

        const { qrUrl, qrImageUrl } = buildQrMetadata(cleanBoxId, req.get("origin"));

        res.status(200).json({
            success: true,
            data: {
                boxId: cleanBoxId,
                qrUrl,
                qrImageUrl,
            },
        });
    } catch (error) {
        next(error);
    }
}
