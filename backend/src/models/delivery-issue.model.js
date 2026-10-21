import mongoose from "mongoose";

const deliveryIssueSchema = new mongoose.Schema(
    {
        deliveryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Delivery",
            required: true,
            index: true,
        },
        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        shipperId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        category: {
            type: String,
            enum: ["vehicle", "pickup", "delivery", "recipient", "safety", "other"],
            required: true,
        },
        description: {
            type: String,
            required: true,
            trim: true,
            minlength: 5,
            maxlength: 2000,
        },
        status: {
            type: String,
            enum: ["open", "resolved"],
            default: "open",
            required: true,
        },
    },
    { timestamps: true },
);

deliveryIssueSchema.index({ shipperId: 1, createdAt: -1 });

const DeliveryIssue = mongoose.model("DeliveryIssue", deliveryIssueSchema);

export default DeliveryIssue;