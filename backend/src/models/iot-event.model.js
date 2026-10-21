import mongoose from "mongoose";

const iotEventSchema = new mongoose.Schema(
    {
        deviceId: {
            type: String,
            required: true,
            index: true,
        },
        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        type: {
            type: String,
            required: true,
            maxlength: 100,
        },
        topic: {
            type: String,
            required: true,
            maxlength: 250,
        },
        payload: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    { timestamps: { createdAt: true, updatedAt: false } },
);

iotEventSchema.index({ ownerId: 1, deviceId: 1, createdAt: -1 });

const IoTEvent = mongoose.model("IoTEvent", iotEventSchema);

export default IoTEvent;