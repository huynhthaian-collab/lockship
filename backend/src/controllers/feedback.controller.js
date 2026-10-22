import * as feedbackService from "../services/feedback.service.js";
import { sendSuccess } from "../utils/api-response.js";
import AppError from "../utils/app-error.js";

export async function createFeedback(req, res, next) {
    try {
        const { rating, comment, tags, orderId, userName, userRole } = req.body;

        const numericRating = Number(rating);
        if (!numericRating || numericRating < 1 || numericRating > 5) {
            return next(new AppError("Vui lòng chọn số sao đánh giá từ 1 đến 5.", 400));
        }

        if (comment && String(comment).length > 500) {
            return next(new AppError("Nội dung nhận xét không được vượt quá 500 ký tự.", 400));
        }

        const resolvedUserId = req.user?._id || req.user?.id || null;
        const resolvedUserName = req.user?.name || userName || "Khách hàng Lockship";
        const resolvedUserRole = req.user?.role || userRole || "customer";

        const feedback = await feedbackService.createFeedback({
            userId: resolvedUserId,
            userName: resolvedUserName,
            userRole: resolvedUserRole,
            orderId: orderId || null,
            rating: numericRating,
            tags: tags || [],
            comment: comment || "",
        });

        return sendSuccess(res, {
            statusCode: 201,
            message: "Đánh giá của bạn đã được ghi nhận thành công! Cảm ơn bạn đã phản hồi.",
            data: { feedback },
        });
    } catch (error) {
        return next(error);
    }
}

export async function listFeedbacks(req, res, next) {
    try {
        const { page, limit, orderId, rating } = req.query;
        const data = await feedbackService.listFeedbacks({
            page,
            limit,
            orderId,
            rating,
            isAdmin: false,
        });

        return sendSuccess(res, {
            message: "Danh sách đánh giá và điểm trung bình.",
            data,
        });
    } catch (error) {
        return next(error);
    }
}

export async function listAdminFeedbacks(req, res, next) {
    try {
        const { page, limit, orderId, rating, status, search } = req.query;
        const data = await feedbackService.listFeedbacks({
            page,
            limit,
            orderId,
            rating,
            status,
            search,
            isAdmin: true,
        });

        return sendSuccess(res, {
            message: "Danh sách quản trị đánh giá và thống kê chi tiết.",
            data,
        });
    } catch (error) {
        return next(error);
    }
}

export async function adminCreateFeedback(req, res, next) {
    try {
        const { userName, userRole, rating, tags, comment, orderId, isVisible, isPinned, adminReply } = req.body;

        const numericRating = Number(rating);
        if (!numericRating || numericRating < 1 || numericRating > 5) {
            return next(new AppError("Số sao đánh giá phải từ 1 đến 5.", 400));
        }

        const feedback = await feedbackService.adminCreateFeedback({
            userName,
            userRole,
            rating: numericRating,
            tags,
            comment,
            orderId,
            isVisible,
            isPinned,
            adminReply,
            adminUserId: req.user?._id || req.user?.id,
        });

        return sendSuccess(res, {
            statusCode: 201,
            message: "Đã tạo đánh giá mới thành công.",
            data: { feedback },
        });
    } catch (error) {
        return next(error);
    }
}

export async function updateFeedback(req, res, next) {
    try {
        const { id } = req.params;
        const updated = await feedbackService.updateFeedback(id, req.body, req.user);

        if (!updated) {
            return next(new AppError("Không tìm thấy đánh giá cần cập nhật.", 404));
        }

        return sendSuccess(res, {
            message: "Đã cập nhật trạng thái đánh giá thành công.",
            data: { feedback: updated },
        });
    } catch (error) {
        return next(error);
    }
}

export async function deleteFeedback(req, res, next) {
    try {
        const { id } = req.params;
        const deleted = await feedbackService.deleteFeedback(id);

        if (!deleted) {
            return next(new AppError("Không tìm thấy đánh giá cần xóa.", 404));
        }

        return sendSuccess(res, {
            message: "Đã xóa đánh giá thành công.",
            data: { id },
        });
    } catch (error) {
        return next(error);
    }
}
