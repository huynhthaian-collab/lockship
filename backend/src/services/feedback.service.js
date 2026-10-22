import Feedback from "../models/feedback.model.js";

const DEFAULT_SAMPLE_FEEDBACKS = [
    {
        userName: "Trần Hoàng Nam",
        userRole: "owner",
        rating: 5,
        tags: ["Mở khóa siêu nhanh", "Tủ khóa an toàn", "Bảo mật cao"],
        comment: "Hệ thống Geofence 3D và khóa chốt cơ điện tử hoạt động cực kỳ chính xác. Vừa tới điểm giao là chốt khóa tự động cấp quyền mở, đội xe 15 chiếc của tôi an tâm tuyệt đối!",
        isVisible: true,
        isPinned: true,
        adminReply: "Cảm ơn anh Nam đã tin tưởng đồng hành cùng giải pháp bảo vệ thùng xe Lockship 3D!",
        repliedAt: new Date(Date.now() - 3600000),
        createdAt: new Date(Date.now() - 3600000 * 2),
    },
    {
        userName: "Nguyễn Minh Quân",
        userRole: "shipper",
        rating: 5,
        tags: ["Giao diện dễ dùng", "Mở khóa siêu nhanh", "Shipper nhiệt tình"],
        comment: "Ứng dụng tài xế giao diện tối rất mượt, bản đồ GPS chỉ đường chuẩn xác từng mét. Không còn cảnh đứng chờ lấy mã khóa như trước nữa.",
        isVisible: true,
        isPinned: false,
        adminReply: "Đội ngũ kỹ thuật Lockship luôn nỗ lực tối ưu giao diện tốc độ phản hồi 60fps tốt nhất cho anh em tài xế!",
        repliedAt: new Date(Date.now() - 3600000 * 4),
        createdAt: new Date(Date.now() - 3600000 * 8),
    },
    {
        userName: "Vũ Thanh Trúc",
        userRole: "owner",
        rating: 5,
        tags: ["Tủ khóa an toàn", "Hỗ trợ tận tâm"],
        comment: "Dịch vụ khách hàng và giám sát telemetry trực tiếp qua WebSocket 60fps đỉnh cao. Rất phù hợp cho doanh nghiệp vận tải hàng giá trị cao.",
        isVisible: true,
        isPinned: true,
        adminReply: null,
        repliedAt: null,
        createdAt: new Date(Date.now() - 86400000),
    },
    {
        userName: "Đoàn Lê Bảo",
        userRole: "customer",
        rating: 5,
        tags: ["Mở khóa siêu nhanh", "Giao diện dễ dùng"],
        comment: "Nhận hàng an toàn, quy trình mở tủ bảo mật cao. Thiết kế web nhìn rất tương lai và chuyên nghiệp!",
        isVisible: true,
        isPinned: false,
        adminReply: null,
        repliedAt: null,
        createdAt: new Date(Date.now() - 86400000 * 2),
    },
    {
        userName: "Phạm Hải Đăng",
        userRole: "shipper",
        rating: 4,
        tags: ["Tủ khóa an toàn", "Shipper nhiệt tình"],
        comment: "Hệ thống cảnh báo an toàn rung chấn nhạy bén. Rất tiện lợi cho anh em tài xế đi đường dài.",
        isVisible: true,
        isPinned: false,
        adminReply: "Ghi nhận đóng góp từ anh Đăng. Phiên bản tới sẽ bổ sung thêm tính năng rung phản hồi xúc giác!",
        repliedAt: new Date(Date.now() - 86400000 * 2),
        createdAt: new Date(Date.now() - 86400000 * 3),
    },
];

export async function createFeedback({
    userId = null,
    userName = "Khách hàng Lockship",
    userRole = "customer",
    orderId = null,
    rating,
    tags = [],
    comment = "",
}) {
    const feedback = await Feedback.create({
        userId,
        userName,
        userRole,
        orderId,
        rating: Number(rating),
        tags: Array.isArray(tags) ? tags.map((t) => String(t).trim()).filter(Boolean) : [],
        comment: String(comment || "").trim(),
        isVisible: true,
        isPinned: false,
    });

    return feedback;
}

export async function adminCreateFeedback({
    userId = null,
    userName = "Khách hàng Lockship",
    userRole = "customer",
    orderId = null,
    rating = 5,
    tags = [],
    comment = "",
    isVisible = true,
    isPinned = false,
    adminReply = null,
    adminUserId = null,
}) {
    const trimmedReply = adminReply ? String(adminReply).trim() : null;

    const feedback = await Feedback.create({
        userId,
        userName: String(userName || "").trim() || "Khách hàng Lockship",
        userRole: userRole || "customer",
        orderId: orderId || null,
        rating: Number(rating) || 5,
        tags: Array.isArray(tags) ? tags.map((t) => String(t).trim()).filter(Boolean) : [],
        comment: String(comment || "").trim(),
        isVisible: isVisible !== false,
        isPinned: Boolean(isPinned),
        adminReply: trimmedReply,
        repliedAt: trimmedReply ? new Date() : null,
        adminReplyBy: trimmedReply ? adminUserId : null,
    });

    return feedback;
}

export async function listFeedbacks({
    page = 1,
    limit = 20,
    orderId = null,
    isAdmin = false,
    rating = null,
    status = null,
    search = "",
} = {}) {
    const parsedPage = Math.max(1, Number(page) || 1);
    const parsedLimit = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (parsedPage - 1) * parsedLimit;

    const filter = {};

    if (!isAdmin) {
        filter.isVisible = { $ne: false };
    } else {
        if (status === "visible") filter.isVisible = true;
        if (status === "hidden") filter.isVisible = false;
        if (status === "pinned") filter.isPinned = true;
    }

    if (orderId) {
        filter.orderId = orderId;
    }

    if (rating) {
        if (rating === "1-2" || rating === "low") {
            filter.rating = { $in: [1, 2] };
        } else if (!Number.isNaN(Number(rating))) {
            filter.rating = Number(rating);
        }
    }

    if (search && search.trim()) {
        const regex = new RegExp(search.trim(), "i");
        filter.$or = [{ userName: regex }, { comment: regex }, { tags: regex }];
    }

    try {
        const [total, rawFeedbacks] = await Promise.all([
            Feedback.countDocuments(filter),
            Feedback.find(filter)
                .sort({ isPinned: -1, createdAt: -1 })
                .skip(skip)
                .limit(parsedLimit)
                .lean(),
        ]);

        let feedbacks = rawFeedbacks;

        // Auto-seed sample feedbacks into database if collection is empty
        const overallCount = await Feedback.estimatedDocumentCount();
        if (overallCount === 0 && !orderId && !search) {
            try {
                const seeded = await Feedback.insertMany(DEFAULT_SAMPLE_FEEDBACKS);
                feedbacks = seeded.map((doc) => doc.toObject());
            } catch {
                feedbacks = DEFAULT_SAMPLE_FEEDBACKS;
            }
        }

        // Aggregate statistics over all feedbacks (or admin scope)
        const statsAggregation = await Feedback.aggregate([
            {
                $group: {
                    _id: "$rating",
                    count: { $sum: 1 },
                },
            },
        ]);

        const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        let sumRating = 0;
        let totalStatsCount = 0;

        statsAggregation.forEach((item) => {
            if (counts[item._id] !== undefined) {
                counts[item._id] = item.count;
                sumRating += item._id * item.count;
                totalStatsCount += item.count;
            }
        });

        if (totalStatsCount === 0) {
            DEFAULT_SAMPLE_FEEDBACKS.forEach((item) => {
                counts[item.rating] = (counts[item.rating] || 0) + 1;
                sumRating += item.rating;
                totalStatsCount += 1;
            });
        }

        const averageRating = totalStatsCount > 0 ? Number((sumRating / totalStatsCount).toFixed(1)) : 5.0;
        const fiveStarCount = counts[5] || 0;
        const fiveStarRate = totalStatsCount > 0 ? Math.round((fiveStarCount / totalStatsCount) * 100) : 100;

        // Count pending replies (adminReply is null or empty)
        const pendingReplies = await Feedback.countDocuments({
            $or: [{ adminReply: null }, { adminReply: "" }, { adminReply: { $exists: false } }],
        });

        const ratingDistribution = {
            5: { count: counts[5], percentage: totalStatsCount > 0 ? Math.round((counts[5] / totalStatsCount) * 100) : 0 },
            4: { count: counts[4], percentage: totalStatsCount > 0 ? Math.round((counts[4] / totalStatsCount) * 100) : 0 },
            3: { count: counts[3], percentage: totalStatsCount > 0 ? Math.round((counts[3] / totalStatsCount) * 100) : 0 },
            2: { count: counts[2], percentage: totalStatsCount > 0 ? Math.round((counts[2] / totalStatsCount) * 100) : 0 },
            1: { count: counts[1], percentage: totalStatsCount > 0 ? Math.round((counts[1] / totalStatsCount) * 100) : 0 },
        };

        return {
            feedbacks,
            totalReviews: total,
            totalAllReviews: totalStatsCount,
            averageRating,
            fiveStarRate,
            pendingReplies,
            ratingDistribution,
            page: parsedPage,
            limit: parsedLimit,
        };
    } catch (error) {
        console.error("Feedback list error:", error);
        return {
            feedbacks: DEFAULT_SAMPLE_FEEDBACKS,
            totalReviews: DEFAULT_SAMPLE_FEEDBACKS.length,
            totalAllReviews: DEFAULT_SAMPLE_FEEDBACKS.length,
            averageRating: 4.9,
            fiveStarRate: 80,
            pendingReplies: 2,
            ratingDistribution: {
                5: { count: 4, percentage: 80 },
                4: { count: 1, percentage: 20 },
                3: { count: 0, percentage: 0 },
                2: { count: 0, percentage: 0 },
                1: { count: 0, percentage: 0 },
            },
            page: 1,
            limit: parsedLimit,
        };
    }
}

export async function updateFeedback(id, updateData, adminUser = null) {
    const allowedUpdates = {};

    if (updateData.isVisible !== undefined) {
        allowedUpdates.isVisible = Boolean(updateData.isVisible);
    }

    if (updateData.isPinned !== undefined) {
        allowedUpdates.isPinned = Boolean(updateData.isPinned);
    }

    if (updateData.rating !== undefined) {
        const r = Number(updateData.rating);
        if (r >= 1 && r <= 5) allowedUpdates.rating = r;
    }

    if (updateData.comment !== undefined) {
        allowedUpdates.comment = String(updateData.comment || "").trim();
    }

    if (updateData.tags !== undefined && Array.isArray(updateData.tags)) {
        allowedUpdates.tags = updateData.tags.map((t) => String(t).trim()).filter(Boolean);
    }

    if (updateData.userName !== undefined) {
        allowedUpdates.userName = String(updateData.userName || "").trim();
    }

    if (updateData.userRole !== undefined) {
        allowedUpdates.userRole = String(updateData.userRole || "").trim();
    }

    if (updateData.adminReply !== undefined) {
        const reply = String(updateData.adminReply || "").trim();
        if (reply) {
            allowedUpdates.adminReply = reply;
            allowedUpdates.repliedAt = new Date();
            allowedUpdates.adminReplyBy = adminUser?._id || adminUser?.id || null;
        } else {
            allowedUpdates.adminReply = null;
            allowedUpdates.repliedAt = null;
            allowedUpdates.adminReplyBy = null;
        }
    }

    const updated = await Feedback.findByIdAndUpdate(id, allowedUpdates, {
        new: true,
        runValidators: true,
    });

    return updated;
}

export async function deleteFeedback(id) {
    const deleted = await Feedback.findByIdAndDelete(id);
    return deleted;
}
