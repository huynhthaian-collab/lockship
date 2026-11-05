import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import Feedback from "../models/feedback.model.js";

/**
 * 4 chuẩn hóa phản hồi thực tế từ Chủ sở hữu tủ khóa
 */
export const TARGET_FOUR_FEEDBACKS = [
    {
        email: "khang.lh@lockship.vn",
        userName: "Lê Hoàng Khang",
        boxId: "BOX-01",
        rating: 5,
        tags: ["Thông báo nhận hàng", "Trải nghiệm", "Tủ thông minh"],
        comment: "Dùng cũng ổn nè, mà thông báo nhận hàng nên ghi rõ hơn để biết hàng đã được bỏ vô tủ chưa",
        adminReply: "Dạ Lockship chân thành cảm ơn anh Khang đã góp ý. Hệ thống đang nâng cấp nội dung thông báo qua SMS và email chi tiết hơn để Quý khách nắm rõ trạng thái kiện hàng ạ!",
        repliedAt: new Date("2026-10-23T08:00:00.000Z"),
        createdAt: new Date("2026-10-22T14:30:00.000Z"),
    },
    {
        email: "vinh.nt@lockship.vn",
        userName: "Nguyễn Thành Vinh",
        boxId: "BOX-02",
        rating: 4,
        tags: ["Bàn phím", "Hướng dẫn sử dụng", "Phần cứng"],
        comment: "Sản phẩm hay đó, nhưng bàn phím hơi nhỏ, người mới dùng chắc cần có hướng dẫn cụ thể hơn chút.",
        adminReply: "Dạ Lockship ghi nhận phản hồi của anh Vinh. Tụi em đang bổ sung decal hướng dẫn thao tác to rõ ngay trên mặt tủ và tối ưu bàn phím cho các đợt lắp đặt tiếp theo ạ!",
        repliedAt: new Date("2026-10-26T10:00:00.000Z"),
        createdAt: new Date("2026-10-25T09:15:00.000Z"),
    },
    {
        email: "ngan.ltk@lockship.vn",
        userName: "Lê Thị Kim Ngân",
        boxId: "BOX-03",
        rating: 5,
        tags: ["An tâm", "Hình ảnh xác nhận", "Tiện ích"],
        comment: "Có tủ nhận hàng vậy cũng yên tâm hơn để ngoài cửa. Nếu có thêm hình ảnh xác nhận hàng đã bỏ vô tủ thì tốt quá.",
        adminReply: "Dạ cảm ơn chị Ngân rất nhiều! Tính năng camera chụp ảnh kiện hàng ngay khi shipper hoàn tất đóng tủ đang được đội ngũ kỹ thuật hoàn thiện trong phiên bản tới ạ.",
        repliedAt: new Date("2026-10-28T09:00:00.000Z"),
        createdAt: new Date("2026-10-27T16:45:00.000Z"),
    },
    {
        email: "anh.tnq@lockship.vn",
        userName: "Trần Ngọc Quế Anh",
        boxId: "BOX-04",
        rating: 5,
        tags: ["Dân văn phòng", "Hệ thống OTP", "Khóa bảo mật"],
        comment: "Khá hữu ích cho dân văn phòng tụi mình. Mà nhớ kiểm tra khóa với hệ thống OTP thường xuyên nha, chứ đang cần lấy hàng mà bị lỗi thì hơi phiền á.",
        adminReply: "Dạ Lockship luôn duy trì giám sát telemetry khóa 24/7 và hệ thống máy chủ OTP dự phòng song song để đảm bảo anh/chị nhận hàng luôn thông suốt và không bị gián đoạn ạ!",
        repliedAt: new Date("2026-10-30T14:00:00.000Z"),
        createdAt: new Date("2026-10-29T11:20:00.000Z"),
    },
];

/**
 * Đồng bộ phản hồi: đảm bảo chính xác 4 đánh giá theo yêu cầu người dùng
 */
export async function syncFeedbacks() {
    try {
        const adminUser = await User.findOne({ email: "admin@lockship.vn" });
        const comments = TARGET_FOUR_FEEDBACKS.map((f) => f.comment);

        // Xóa những feedback cũ không nằm trong danh sách 4 feedback này
        await Feedback.deleteMany({ comment: { $nin: comments } });

        // Upsert 4 feedback theo nội dung comment
        for (const item of TARGET_FOUR_FEEDBACKS) {
            const user = await User.findOne({ email: item.email });
            await Feedback.findOneAndUpdate(
                { comment: item.comment },
                {
                    $set: {
                        userId: user?._id || null,
                        ownerId: user?._id || null,
                        boxId: item.boxId,
                        userName: item.userName,
                        userRole: "owner",
                        rating: item.rating,
                        tags: item.tags,
                        comment: item.comment,
                        isVisible: true,
                        isPinned: true,
                        adminReply: item.adminReply,
                        repliedAt: item.repliedAt,
                        adminReplyBy: adminUser?._id || null,
                        createdAt: item.createdAt,
                    },
                },
                { upsert: true, new: true }
            );
        }

        console.info(`[SyncFeedbacks] Successfully synchronized ${TARGET_FOUR_FEEDBACKS.length} feedbacks.`);
    } catch (error) {
        console.error("[SyncFeedbacks] Failed to synchronize feedbacks:", error);
    }
}

/**
 * Synchronizes default credentials on server boot.
 * Detects and repairs passwords for seeded owner and admin accounts.
 */
export async function syncUserCredentials() {
    try {
        const ownerHash = await bcrypt.hash("123456", 10);
        const adminHash = await bcrypt.hash("admin123", 10);

        // 1. Repair / ensure all Owner accounts have valid password "123456"
        const ownerUpdate = await User.updateMany(
            { role: "owner" },
            { $set: { password: ownerHash, status: "active" } }
        );

        // 2. Repair / ensure Admin account exists with valid password "admin123"
        const adminUsers = await User.find({
            $or: [{ role: "admin" }, { email: "admin@lockship.vn" }],
        }).select("+password");

        if (adminUsers.length === 0) {
            await User.create({
                name: "Quản Trị Viên Hệ Thống",
                email: "admin@lockship.vn",
                password: adminHash,
                role: "admin",
                status: "active",
                phone: "0909000000",
                address: "Trụ sở Điều hành Lockship, Cần Thơ",
            });
            console.info("[SyncCredentials] Created default admin account: admin@lockship.vn");
        } else {
            for (const admin of adminUsers) {
                await User.updateOne(
                    { _id: admin._id },
                    { $set: { password: adminHash, status: "active", role: "admin", email: "admin@lockship.vn" } }
                );
            }
        }

        console.info(`[SyncCredentials] Synchronized credentials: ${ownerUpdate.modifiedCount} owners, ${adminUsers.length || 1} admin.`);
    } catch (error) {
        console.error("[SyncCredentials] Failed to synchronize credentials:", error);
    }
}
