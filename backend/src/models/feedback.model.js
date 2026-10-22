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
    },
    { timestamps: true }
);

feedbackSchema.index({ createdAt: -1 });
feedbackSchema.index({ rating: -1 });

const Feedback = mongoose.model("Feedback", feedbackSchema);

export default Feedback;
