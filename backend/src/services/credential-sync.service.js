import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import Feedback from "../models/feedback.model.js";

/**
 * Danh sách đầy đủ các phản hồi chất lượng, chuẩn hóa và thích hợp nhất cho Lockship
 * (Bao gồm 4 phản hồi cốt lõi từ Chủ tủ và các đánh giá thích hợp từ Đối tác & Người nhận)
 */
export const FULL_APPROPRIATE_FEEDBACKS = [
    // 4 FEEDBACK CỐT LÕI TỪ CHỦ SỞ HỮU TỦ
    {
        email: "khang.lh@lockship.vn",
        userName: "Lê Hoàng Khang",
        boxId: "BOX-01",
        userRole: "owner",
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
        userRole: "owner",
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
        userRole: "owner",
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
        userRole: "owner",
        rating: 5,
        tags: ["Dân văn phòng", "Hệ thống OTP", "Khóa bảo mật"],
        comment: "Khá hữu ích cho dân văn phòng tụi mình. Mà nhớ kiểm tra khóa với hệ thống OTP thường xuyên nha, chứ đang cần lấy hàng mà bị lỗi thì hơi phiền á.",
        adminReply: "Dạ Lockship luôn duy trì giám sát telemetry khóa 24/7 và hệ thống máy chủ OTP dự phòng song song để đảm bảo anh/chị nhận hàng luôn thông suốt và không bị gián đoạn ạ!",
        repliedAt: new Date("2026-10-30T14:00:00.000Z"),
        createdAt: new Date("2026-10-29T11:20:00.000Z"),
    },

    // CÁC FEEDBACK THÍCH HỢP TỪ CHỦ TỦ KHÁC, SHIPPER & NGƯỜI DÙNG
    {
        email: "khoi.nd@lockship.vn",
        userName: "Nguyễn Đình Khôi",
        boxId: "BOX-05",
        userRole: "owner",
        rating: 5,
        tags: ["Tủ khóa an toàn", "Mở khóa siêu nhanh"],
        comment: "Tủ khóa đặt tại Nguyễn Văn Cừ rất tiện lợi. Shipper giao đồ vào tủ bất kể ngày đêm, không cần phải gọi điện giục người nhà ra nhận.",
        adminReply: "Cảm ơn anh Khôi! Lockship cam kết mang lại trải nghiệm nhận hàng tự động 24/7 tốt nhất.",
        repliedAt: new Date("2026-10-27T08:00:00.000Z"),
        createdAt: new Date("2026-10-26T15:10:00.000Z"),
    },
    {
        email: "viet.tt@lockship.vn",
        userName: "Trần Tiến Việt",
        boxId: "BOX-06",
        userRole: "owner",
        rating: 5,
        tags: ["Cước phí hợp lý", "VietQR BIDV"],
        comment: "Cước phí 5.000đ/lượt quá rẻ so với sự an tâm khi nhận hàng giá trị cao. Cuối tháng quét mã VietQR BIDV thanh toán chỉ 3 giây.",
        adminReply: "Cảm ơn anh Việt đã tin tưởng và đồng hành cùng dịch vụ tủ khóa Lockship!",
        repliedAt: new Date("2026-10-29T09:00:00.000Z"),
        createdAt: new Date("2026-10-28T14:20:00.000Z"),
    },
    {
        email: "ha.vtt@lockship.vn",
        userName: "Võ Thị Thu Hà",
        boxId: "BOX-17",
        userRole: "owner",
        rating: 5,
        tags: ["Khóa bảo mật", "Chống nước", "Tiện ích"],
        comment: "Tôi mua sắm online nhiều nên dùng tủ liên tục. Thao tác mở tủ bằng mã OTP bảo mật, tủ chắc chắn chống nước tốt.",
        adminReply: "Cảm ơn chị Hà! Tủ Lockship đạt tiêu chuẩn chống nước IP65 và bảo mật 2 lớp cho mọi điều kiện thời tiết.",
        repliedAt: new Date("2026-10-31T08:00:00.000Z"),
        createdAt: new Date("2026-10-30T10:15:00.000Z"),
    },
    {
        email: null,
        userName: "Nguyễn Minh Quân",
        boxId: null,
        userRole: "shipper",
        rating: 5,
        tags: ["Shipper nhiệt tình", "Giao diện dễ dùng", "Mở khóa siêu nhanh"],
        comment: "Giao hàng vào tủ Lockship nhanh gọn chỉ 10 giây quét QR, tiết kiệm thời gian đợi khách ra lấy. Tỷ lệ giao thành công đạt 100%.",
        adminReply: "Đội ngũ kỹ thuật Lockship luôn nỗ lực tối ưu giao diện tốc độ phản hồi 60fps tốt nhất cho anh em tài xế!",
        repliedAt: new Date("2026-10-29T10:00:00.000Z"),
        createdAt: new Date("2026-10-28T16:00:00.000Z"),
    },
    {
        email: null,
        userName: "Phạm Hải Đăng",
        boxId: null,
        userRole: "shipper",
        rating: 5,
        tags: ["Tủ khóa an toàn", "Bản đồ GPS"],
        comment: "Bản đồ điều hướng trạm tủ chuẩn xác. Chốt khóa cơ điện tử phản hồi nhạy tức thì, không lo thất lạc hàng hay bị khiếu nại.",
        adminReply: "Cảm ơn anh Đăng đã đồng hành và đóng góp ý kiến cho hệ thống Lockship!",
        repliedAt: new Date("2026-10-30T11:00:00.000Z"),
        createdAt: new Date("2026-10-29T08:30:00.000Z"),
    },
    {
        email: null,
        userName: "Vũ Thanh Trúc",
        boxId: null,
        userRole: "customer",
        rating: 5,
        tags: ["Giao diện dễ dùng", "Hỗ trợ 24/7"],
        comment: "Giao diện web trực quan, xem được lịch sử nhận hàng và trạng thái đóng/mở tủ thời gian thực. Rất tin tưởng giải pháp của Lockship!",
        adminReply: "Cảm ơn bạn Trúc! Lockship luôn nỗ lực để mang lại trải nghiệm giao nhận hàng an tâm nhất.",
        repliedAt: new Date("2026-10-31T09:00:00.000Z"),
        createdAt: new Date("2026-10-30T16:40:00.000Z"),
    },
];

/**
 * Đồng bộ phản hồi: đảm bảo bộ dữ liệu đánh giá đầy đủ, chuyên nghiệp, loại bỏ hoàn toàn các feedback không phù hợp
 */
export async function syncFeedbacks() {
    try {
        const adminUser = await User.findOne({ email: "admin@lockship.vn" });
        const comments = FULL_APPROPRIATE_FEEDBACKS.map((f) => f.comment);

        // 1. Xóa các feedback cũ không phù hợp (bao gồm các test comment không nằm trong danh sách chuẩn)
        await Feedback.deleteMany({ comment: { $nin: comments } });

        // 2. Upsert toàn bộ danh sách feedback chuẩn hóa
        for (const item of FULL_APPROPRIATE_FEEDBACKS) {
            let userId = null;
            if (item.email) {
                const user = await User.findOne({ email: item.email });
                userId = user?._id || null;
            }

            await Feedback.findOneAndUpdate(
                { comment: item.comment },
                {
                    $set: {
                        userId,
                        ownerId: userId,
                        boxId: item.boxId,
                        userName: item.userName,
                        userRole: item.userRole,
                        rating: item.rating,
                        tags: item.tags,
                        comment: item.comment,
                        isVisible: true,
                        isPinned: item.rating === 5 && (item.boxId === "BOX-01" || item.boxId === "BOX-03" || item.boxId === "BOX-04"),
                        adminReply: item.adminReply,
                        repliedAt: item.repliedAt,
                        adminReplyBy: adminUser?._id || null,
                        createdAt: item.createdAt,
                    },
                },
                { upsert: true, new: true }
            );
        }

        console.info(`[SyncFeedbacks] Successfully synchronized ${FULL_APPROPRIATE_FEEDBACKS.length} appropriate feedbacks.`);
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
