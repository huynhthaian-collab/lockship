import mongoose from "mongoose";

const deliveryStatuses = [
    "pending",
    "assigned",
    "accepted",
    "in-progress",
    "arrived",
    "authorized",
    "completed",
    "delivered_to_locker",
    "DELIVERED_TO_LOCKER",
    "cancelled",
];

const deliverySchema = new mongoose.Schema(
    {
        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        shipperId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
            index: true,
        },
        vehicleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Vehicle",
            default: null,
        },
        pickupAddress: {
            type: String,
            required: true,
            trim: true,
            maxlength: 500,
        },
        deliveryAddress: {
            type: String,
            required: true,
            trim: true,
            maxlength: 500,
        },
        pickupLocation: {
            lat: { type: Number, default: 10.0360 },
            lng: { type: Number, default: 105.7818 },
        },
        deliveryLocation: {
            lat: { type: Number, default: 10.0336 },
            lng: { type: Number, default: 105.7882 },
        },
        boxId: {
            type: String,
            trim: true,
            default: null,
        },
        recipientName: {
            type: String,
            trim: true,
            default: null,
        },
        recipientPhone: {
            type: String,
            trim: true,
            default: null,
        },
        packageSize: {
            type: String,
            trim: true,
            default: 'M',
        },
        description: {
            type: String,
            trim: true,
            maxlength: 2000,
            default: null,
        },
        status: {
            type: String,
            enum: deliveryStatuses,
            default: "pending",
            required: true,
        },
        unlockStatus: {
            type: String,
            enum: ["pending", "succeeded", "failed"],
            default: null,
        },
        arrivedAt: {
            type: Date,
            default: null,
        },
        authorizedAt: {
            type: Date,
            default: null,
        },
        completedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true },
);

deliverySchema.index({ ownerId: 1, createdAt: -1 });
deliverySchema.index({ shipperId: 1, status: 1, createdAt: -1 });

const Delivery = mongoose.model("Delivery", deliverySchema);

export { deliveryStatuses };
export default Delivery;