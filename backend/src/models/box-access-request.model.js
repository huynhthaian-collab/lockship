import mongoose from "mongoose";

const boxAccessRequestSchema = new mongoose.Schema(
    {
        boxId: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        shipperName: {
            type: String,
            trim: true,
            maxlength: 120,
            default: "Shipper vãng lai",
        },
        shipperPhone: {
            type: String,
            required: true,
            trim: true,
            maxlength: 30,
        },
        deliverySource: {
            type: String,
            trim: true,
            maxlength: 120,
            default: "Đơn hàng ngoài hệ thống",
        },
        packageDescription: {
            type: String,
            trim: true,
            maxlength: 500,
            default: "",
        },
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Delivery",
            default: null,
            index: true,
        },
        status: {
            type: String,
            enum: ["PENDING", "APPROVED", "REJECTED"],
            default: "PENDING",
            index: true,
        },
        unlockCode: {
            type: String,
            trim: true,
            default: null,
        },
        respondedAt: {
            type: Date,
            default: null,
        },
        notes: {
            type: String,
            trim: true,
            maxlength: 500,
            default: "",
        },
    },
    {
        timestamps: true,
    },
);

boxAccessRequestSchema.index({ ownerId: 1, status: 1, createdAt: -1 });
boxAccessRequestSchema.index({ boxId: 1, status: 1 });

const BoxAccessRequest = mongoose.model("BoxAccessRequest", boxAccessRequestSchema);

export default BoxAccessRequest;
