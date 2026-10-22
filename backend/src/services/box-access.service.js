import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import BoxAccessRequest from "../models/box-access-request.model.js";
import Delivery from "../models/delivery.model.js";
import IoTDevice from "../models/iot-device.model.js";
import User from "../models/user.model.js";
import { env } from "../config/env.js";
import AppError from "../utils/app-error.js";
import { emitToRequest, emitToUser } from "./socket.service.js";
import { createNotification } from "./notification.service.js";
import { sendBoxAccessNotificationEmail } from "./email.service.js";

// Canonical Box list for metadata enrichment
const KNOWN_BOXES = {
    "box-04": {
        name: "Lockship Box #04 (Bến Ninh Kiều)",
        address: "Số 2 Đường Hai Bà Trưng, Phường Tân An, Quận Ninh Kiều, TP. Cần Thơ",
        compartments: 12,
    },
    "box-05": {
        name: "Lockship Box #05 (ĐH Cần Thơ)",
        address: "Khu II, Đường 3 Tháng 2, Phường Xuân Khánh, Quận Ninh Kiều, TP. Cần Thơ",
        compartments: 16,
    },
    "box-06": {
        name: "Lockship Box #06 (Vincom Hùng Vương)",
        address: "Số 2 Đường Hùng Vương, Phường Thới Bình, Quận Ninh Kiều, TP. Cần Thơ",
        compartments: 10,
    },
};

/**
 * Resolve the owner associated with a box identifier
 */
export async function resolveBoxOwner(boxId) {
    const cleanId = String(boxId || "").trim();
    if (!cleanId) {
        throw new AppError("Box ID is required.", 400);
    }

    // 1. Try matching an IoT device
    const device = await IoTDevice.findOne({
        deviceId: { $regex: new RegExp(`^${cleanId}$`, "i") },
    });
    if (device && device.ownerId) {
        return device.ownerId;
    }

    // 2. Try matching a delivery assigned to this boxId
    const deliveryQuery = Delivery.findOne({
        boxId: { $regex: new RegExp(`^${cleanId}$`, "i") },
    });
    const delivery = typeof deliveryQuery?.sort === "function"
        ? await deliveryQuery.sort({ createdAt: -1 })
        : await deliveryQuery;
    if (delivery && delivery.ownerId) {
        return delivery.ownerId;
    }

    // 3. Fallback to an active owner user
    const owner = await User.findOne({ role: "owner", status: "active" });
    if (owner) {
        return owner._id;
    }

    // 4. Fallback to any active admin
    const admin = await User.findOne({ role: "admin", status: "active" });
    if (admin) {
        return admin._id;
    }

    throw new AppError("Không tìm thấy chủ sở hữu tủ khóa tương ứng.", 404);
}

/**
 * Get public box information
 */
export async function getPublicBoxInfo(boxId) {
    const cleanId = String(boxId || "").trim().toLowerCase();
    const meta = KNOWN_BOXES[cleanId] || {
        name: `Lockship Smart Locker #${cleanId.toUpperCase()}`,
        address: "Vị trí trạm tủ thông minh Lockship",
        compartments: 8,
    };

    return {
        boxId: cleanId,
        name: meta.name,
        address: meta.address,
        isOnline: true,
        compartments: meta.compartments,
    };
}

/**
 * Create a public access request from guest shipper
 */
export async function createPublicAccessRequest({ boxId, shipperName, shipperPhone, deliverySource, packageDescription }) {
    const cleanBoxId = String(boxId || "").trim();
    const cleanPhone = String(shipperPhone || "").trim();

    if (!cleanBoxId) {
        throw new AppError("Mã tủ khóa (Box ID) là bắt buộc.", 400);
    }
    if (!cleanPhone || cleanPhone.length < 8) {
        throw new AppError("Vui lòng cung cấp số điện thoại hợp lệ của Shipper.", 400);
    }

    const ownerId = await resolveBoxOwner(cleanBoxId);

    const request = await BoxAccessRequest.create({
        boxId: cleanBoxId,
        ownerId,
        shipperName: (shipperName || "Shipper vãng lai").trim(),
        shipperPhone: cleanPhone,
        deliverySource: (deliverySource || "Đơn hàng ngoài hệ thống").trim(),
        packageDescription: (packageDescription || "").trim(),
        status: "PENDING",
    });

    // Create a guest token for verified Socket.IO access
    const guestToken = jwt.sign(
        {
            sub: `guest_${request._id}`,
            purpose: "guest-box-access",
            requestId: request._id.toString(),
            boxId: cleanBoxId,
        },
        env.JWT_SECRET,
        { expiresIn: "4h" },
    );

    // Push real-time event to owner
    emitToUser(ownerId, "new_box_request", {
        requestId: request._id.toString(),
        boxId: cleanBoxId,
        shipperName: request.shipperName,
        shipperPhone: request.shipperPhone,
        deliverySource: request.deliverySource,
        packageDescription: request.packageDescription,
        createdAt: request.createdAt,
    });

    // Create persistent notification for owner
    try {
        await createNotification({
            userId: ownerId,
            type: "box_access_request",
            title: `Yêu cầu mở tủ ${cleanBoxId} từ Shipper vãng lai`,
            message: `${request.shipperName} (${request.shipperPhone}) vừa yêu cầu mở tủ ${cleanBoxId} để giao hàng (${request.deliverySource}).`,
            isRead: false,
        });
    } catch (notifErr) {
        console.warn("Could not create box access notification:", notifErr.message);
    }

    // Send email alert to owner
    User.findById(ownerId).select("email").then((owner) => {
        if (owner?.email) {
            sendBoxAccessNotificationEmail(owner.email, {
                boxId: cleanBoxId,
                shipperName: request.shipperName,
                shipperPhone: request.shipperPhone,
                deliverySource: request.deliverySource,
                requestedAt: request.createdAt,
            }).catch(() => null);
        }
    }).catch(() => null);

    return {
        request,
        guestToken,
    };
}

/**
 * Get status of an access request for public polling / reconnecting
 */
export async function getPublicRequestStatus(boxId, requestId) {
    if (!mongoose.isValidObjectId(requestId)) {
        throw new AppError("Mã yêu cầu không hợp lệ.", 400);
    }

    const request = await BoxAccessRequest.findOne({
        _id: requestId,
        boxId: { $regex: new RegExp(`^${boxId}$`, "i") },
    }).populate("orderId", "pickupAddress deliveryAddress description status");

    if (!request) {
        throw new AppError("Không tìm thấy yêu cầu mở tủ.", 404);
    }

    return {
        id: request._id,
        boxId: request.boxId,
        shipperName: request.shipperName,
        shipperPhone: request.shipperPhone,
        deliverySource: request.deliverySource,
        status: request.status,
        unlockCode: request.status === "APPROVED" ? request.unlockCode : null,
        order: request.orderId,
        respondedAt: request.respondedAt,
        notes: request.notes,
        createdAt: request.createdAt,
    };
}

/**
 * List access requests for Owner
 */
export async function listOwnerAccessRequests(ownerId, { status } = {}) {
    const filter = { ownerId };
    if (status && status !== "ALL") {
        filter.status = status;
    }

    const requests = await BoxAccessRequest.find(filter)
        .populate("orderId", "pickupAddress deliveryAddress status description boxId")
        .sort({ createdAt: -1 })
        .limit(50);

    // Also get active deliveries assigned to the boxes in these requests
    const boxIds = [...new Set(requests.map((r) => r.boxId))];
    const candidateDeliveries = await Delivery.find({
        ownerId,
        status: { $in: ["pending", "assigned", "accepted", "in-progress", "arrived"] },
    })
        .select("pickupAddress deliveryAddress status boxId description recipientName recipientPhone")
        .sort({ createdAt: -1 });

    return {
        requests,
        candidateDeliveries,
    };
}

/**
 * Owner responds to an access request (APPROVE / REJECT)
 */
export async function respondAccessRequest(ownerId, requestId, { action, orderId, notes } = {}) {
    if (!mongoose.isValidObjectId(requestId)) {
        throw new AppError("Mã yêu cầu không hợp lệ.", 400);
    }

    const request = await BoxAccessRequest.findOne({ _id: requestId, ownerId });
    if (!request) {
        throw new AppError("Không tìm thấy yêu cầu mở tủ hoặc bạn không có quyền xử lý.", 404);
    }

    if (request.status !== "PENDING") {
        throw new AppError(`Yêu cầu này đã được xử lý trước đó (${request.status}).`, 400);
    }

    const normalizedAction = String(action || "").toUpperCase();

    if (normalizedAction === "REJECT") {
        request.status = "REJECTED";
        request.respondedAt = new Date();
        request.notes = notes || "Chủ tủ từ chối yêu cầu mở tủ.";
        await request.save();

        // Push real-time event to Shipper's private request room
        emitToRequest(request._id.toString(), "request_rejected", {
            requestId: request._id.toString(),
            boxId: request.boxId,
            status: "REJECTED",
            reason: request.notes,
            respondedAt: request.respondedAt,
        });

        return { request };
    }

    if (normalizedAction === "APPROVE") {
        // Generate secure 6-digit PIN code
        const unlockCode = Math.floor(100000 + Math.random() * 900000).toString();

        let linkedDelivery = null;
        if (orderId && mongoose.isValidObjectId(orderId)) {
            linkedDelivery = await Delivery.findOne({ _id: orderId, ownerId });
            if (linkedDelivery) {
                linkedDelivery.status = "delivered_to_locker";
                linkedDelivery.unlockStatus = "succeeded";
                linkedDelivery.completedAt = new Date();
                await linkedDelivery.save();
                request.orderId = linkedDelivery._id;
            }
        }

        request.status = "APPROVED";
        request.unlockCode = unlockCode;
        request.respondedAt = new Date();
        request.notes = notes || "Đã phê duyệt và cấp mã mở tủ cho shipper.";
        await request.save();

        // Push real-time event to Shipper's private request room
        emitToRequest(request._id.toString(), "request_approved", {
            requestId: request._id.toString(),
            boxId: request.boxId,
            unlockCode,
            status: "APPROVED",
            orderId: request.orderId ? request.orderId.toString() : null,
            orderInfo: linkedDelivery
                ? {
                    id: linkedDelivery._id,
                    deliveryAddress: linkedDelivery.deliveryAddress,
                    description: linkedDelivery.description,
                    status: linkedDelivery.status,
                }
                : null,
            deliverySource: request.deliverySource,
            shipperName: request.shipperName,
            respondedAt: request.respondedAt,
            message: "Chủ tủ đã phê duyệt! Bạn có thể sử dụng mã PIN dưới đây để mở hộc tủ.",
        });

        return {
            request,
            unlockCode,
            linkedDelivery,
        };
    }

    throw new AppError("Hành động không hợp lệ. Vui lòng chọn APPROVE hoặc REJECT.", 400);
}
