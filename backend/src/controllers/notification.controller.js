import * as notificationService from "../services/notification.service.js";
import { sendSuccess } from "../utils/api-response.js";

export async function listNotifications(req, res) {
    const notifications = await notificationService.listUserNotifications(req.user.id);
    return sendSuccess(res, {
        message: "Notifications retrieved successfully.",
        data: { notifications },
    });
}

export async function markNotificationRead(req, res) {
    const notification = await notificationService.markNotificationRead(req.user.id, req.params.id);
    return sendSuccess(res, {
        message: "Notification marked as read.",
        data: { notification },
    });
}

export async function markAllNotificationsRead(req, res) {
    const result = await notificationService.markAllNotificationsRead(req.user.id);
    return sendSuccess(res, {
        message: "All notifications marked as read.",
        data: result,
    });
}