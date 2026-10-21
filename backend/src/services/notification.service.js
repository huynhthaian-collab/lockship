import mongoose from "mongoose";
import Notification from "../models/notification.model.js";
import AppError from "../utils/app-error.js";
import { emitToUser } from "./socket.service.js";

export function emitNotificationNew(notification) {
    if (!notification) {
        return;
    }

    emitToUser(notification.userId, "notification:new", {
        id: notification.id ?? notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        deliveryId: notification.deliveryId?.toString() ?? null,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
    });
}

export async function createNotification(notificationData) {
    const notification = await Notification.create(notificationData);
    emitNotificationNew(notification);
    return notification;
}

export async function createDeliveryArrivedNotification(delivery) {
    const identity = {
        userId: delivery.ownerId,
        type: "delivery_arrived",
        deliveryId: delivery._id,
    };
    const notificationData = {
        ...identity,
        title: "Shipper arrived at destination",
        message: `Delivery ${delivery._id} has arrived. Pickup: ${delivery.pickupAddress}. Destination: ${delivery.deliveryAddress}.`,
        isRead: false,
    };

    let notification;
    try {
        notification = await Notification.findOneAndUpdate(
            identity,
            { $setOnInsert: notificationData },
            { upsert: true, new: true, runValidators: true },
        );
    } catch (error) {
        if (error.code !== 11000) {
            throw error;
        }
        notification = await Notification.findOne(identity);
    }

    emitNotificationNew(notification);
    return notification;
}

export async function createUnlockCodeNotification(delivery, expiresAt) {
    const identity = {
        userId: delivery.shipperId,
        type: "unlock_code_issued",
        deliveryId: delivery._id,
    };
    const notificationData = {
        ...identity,
        title: "Unlock code ready",
        message: `An unlock code for delivery ${delivery.id} was sent to your email. It expires at ${expiresAt.toISOString()}.`,
        isRead: false,
    };

    let notification;
    try {
        notification = await Notification.findOneAndUpdate(
            identity,
            { $set: { ...notificationData, isRead: false } },
            { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
        );
    } catch (error) {
        if (error.code !== 11000) {
            throw error;
        }
        notification = await Notification.findOneAndUpdate(
            identity,
            { $set: { ...notificationData, isRead: false } },
            { new: true, runValidators: true },
        );
    }

    emitNotificationNew(notification);
    return notification;
}

export async function listUserNotifications(userId) {
    return Notification.find({ userId }).sort({ createdAt: -1 });
}

export async function markNotificationRead(userId, notificationId) {
    if (!mongoose.isValidObjectId(notificationId)) {
        throw new AppError("The supplied notification ID is invalid.", 400);
    }

    const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, userId },
        { $set: { isRead: true } },
        { new: true, runValidators: true },
    );
    if (!notification) {
        throw new AppError("Notification was not found.", 404);
    }

    return notification;
}

export async function markAllNotificationsRead(userId) {
    const result = await Notification.updateMany(
        { userId, isRead: false },
        { $set: { isRead: true } },
    );
    return { modifiedCount: result.modifiedCount };
}