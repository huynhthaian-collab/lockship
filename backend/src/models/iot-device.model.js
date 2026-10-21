import { randomUUID } from "node:crypto";
import mongoose from "mongoose";

const iotDeviceSchema = new mongoose.Schema(
    {
        deviceId: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            minlength: 3,
            maxlength: 100,
            match: /^[A-Za-z0-9_-]+$/,
        },
        credentialId: {
            type: String,
            required: true,
            immutable: true,
            default: () => randomUUID(),
        },
        vehicleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Vehicle",
            required: true,
            unique: true,
        },
        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        status: {
            type: String,
            enum: ["online", "offline"],
            default: "offline",
            required: true,
        },
        lockStatus: {
            type: String,
            enum: ["locked", "unlocked"],
            default: "locked",
            required: true,
        },
        battery: {
            type: Number,
            min: 0,
            max: 100,
            default: null,
        },
        lastSeen: {
            type: Date,
            default: null,
        },
        firmwareVersion: {
            type: String,
            trim: true,
            maxlength: 80,
            default: null,
        },
    },
    {
        timestamps: true,
        toJSON: {
            transform(_document, returnedObject) {
                delete returnedObject.credentialId;
                delete returnedObject.__v;
                return returnedObject;
            },
        },
    },
);

iotDeviceSchema.index({ ownerId: 1, createdAt: -1 });

const IoTDevice = mongoose.model("IoTDevice", iotDeviceSchema);

export default IoTDevice;