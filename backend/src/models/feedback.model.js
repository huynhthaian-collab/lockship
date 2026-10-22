import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
            index: true,
        },
        userName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
            default: "Khách hàng Lockship",
        },
        userRole: {
            type: String,
            enum: ["owner", "shipper", "admin", "customer", "guest"],
            default: "customer",
        },
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Delivery",
            default: null,
            index: true,
        },
        rating: {
            type: Number,
            required: [true, "Số sao đánh giá là bắt buộc."],
            min: [1, "Đánh giá tối thiểu 1 sao."],
            max: [5, "Đánh giá tối đa 5 sao."],
        },
        tags: {
            type: [String],
            default: [],
        },
        comment: {
            type: String,
            trim: true,
            maxlength: [500, "Nội dung nhận xét tối đa 500 ký tự."],
            default: "",
        },
        isVisible: {
            type: Boolean,
            default: true,
            index: true,
        },
        isPinned: {
            type: Boolean,
            default: false,
            index: true,
        },
        adminReply: {
            type: String,
            trim: true,
            maxlength: [1000, "Câu trả lời của Admin tối đa 1000 ký tự."],
            default: null,
        },
        repliedAt: {
            type: Date,
            default: null,
        },
        adminReplyBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    { timestamps: true }
);

feedbackSchema.index({ isPinned: -1, createdAt: -1 });
feedbackSchema.index({ isVisible: 1, createdAt: -1 });
feedbackSchema.index({ rating: -1, createdAt: -1 });
feedbackSchema.index({ userId: 1, orderId: 1 });
feedbackSchema.index({ userId: 1, createdAt: -1 });

const Feedback = mongoose.model("Feedback", feedbackSchema);

export default Feedback;
