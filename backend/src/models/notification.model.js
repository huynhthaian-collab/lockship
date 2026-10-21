import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        type: {
            type: String,
            required: true,
            trim: true,
            maxlength: 80,
        },
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 160,
        },
        message: {
            type: String,
            required: true,
            trim: true,
            maxlength: 1200,
        },
        deliveryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Delivery",
            default: null,
        },
        isRead: {
            type: Boolean,
            default: false,
            required: true,
        },
    },
    { timestamps: { createdAt: true, updatedAt: false } },
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index(
    { userId: 1, type: 1, deliveryId: 1 },
    {
        unique: true,
        partialFilterExpression: { deliveryId: { $type: "objectId" } },
    },
);

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;