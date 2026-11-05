import mongoose from "mongoose";

const boxSchema = new mongoose.Schema(
    {
        boxId: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true,
        },
        code: {
            type: String,
            trim: true,
            default: null,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
            index: true,
        },
        registrationStatus: {
            type: String,
            enum: ["UNASSIGNED", "PENDING_INSTALLATION", "ACTIVE"],
            default: "UNASSIGNED",
            index: true,
        },
        requestedAddress: {
            type: String,
            trim: true,
            default: null,
        },
        requestedNote: {
            type: String,
            trim: true,
            default: "",
        },
        requestedAt: {
            type: Date,
            default: null,
        },
        address: {
            type: String,
            trim: true,
            default: null,
        },
        location: {
            lat: { type: Number, default: null },
            lng: { type: Number, default: null },
        },
        status: {
            type: String,
            enum: ["AVAILABLE", "ONLINE", "OCCUPIED", "MAINTENANCE", "OFFLINE"],
            default: "AVAILABLE",
            index: true,
        },
        lockStatus: {
            type: String,
            enum: ["locked", "unlocked"],
            default: "locked",
        },
        pinCode: {
            type: String,
            trim: true,
            default: "123456",
        },
        qrUrl: {
            type: String,
            trim: true,
            default: null,
        },
        qrImageUrl: {
            type: String,
            trim: true,
            default: null,
        },
        totalCompartments: {
            type: Number,
            default: 12,
            min: 1,
        },
        availableCompartments: {
            type: Number,
            default: 8,
            min: 0,
        },
        battery: {
            type: Number,
            default: 95,
            min: 0,
            max: 100,
        },
        batteryLevel: {
            type: Number,
            default: 95,
            min: 0,
            max: 100,
        },
        lockHealthStatus: {
            type: String,
            enum: ["HEALTHY", "WARNING", "ERROR"],
            default: "HEALTHY",
        },
        otpServiceStatus: {
            type: String,
            enum: ["ONLINE", "DEGRADED", "OFFLINE"],
            default: "ONLINE",
        },
        lastHeartbeat: {
            type: Date,
            default: Date.now,
        },
        masterBackupPin: {
            type: String,
            trim: true,
            default: "888999",
        },
        hasParcel: {
            type: Boolean,
            default: false,
        },
        lastParcelDeliveredAt: {
            type: Date,
            default: null,
        },
        lastDeliveryProofImage: {
            type: String,
            default: null,
        },
        currentOtp: {
            type: String,
            default: null,
        },
        otpExpiresAt: {
            type: Date,
            default: null,
        },
        isOnline: {
            type: Boolean,
            default: true,
        },
        description: {
            type: String,
            trim: true,
            default: "",
        },
        installedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
        toJSON: {
            transform(_doc, ret) {
                delete ret.__v;
                return ret;
            },
        },
    },
);

boxSchema.index({ ownerId: 1, registrationStatus: 1 });
boxSchema.index({ registrationStatus: 1, createdAt: -1 });

const Box = mongoose.models.Box || mongoose.model("Box", boxSchema, "boxes");

export default Box;
