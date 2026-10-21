import mongoose from "mongoose";

const unlockCodeSchema = new mongoose.Schema(
    {
        deliveryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Delivery",
            required: true,
            unique: true,
        },
        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        shipperId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        codeHash: {
            type: String,
            required: true,
            select: false,
        },
        encryptedCode: {
            type: String,
            required: true,
            select: false,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
        used: {
            type: Boolean,
            default: false,
            required: true,
        },
        attempts: {
            type: Number,
            default: 0,
            min: 0,
            required: true,
        },
        usedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: { createdAt: true, updatedAt: false } },
);

unlockCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

unlockCodeSchema.set("toJSON", {
    transform(_document, returnedObject) {
        delete returnedObject.codeHash;
        delete returnedObject.encryptedCode;
        delete returnedObject.__v;
        return returnedObject;
    },
});

const UnlockCode = mongoose.model("UnlockCode", unlockCodeSchema);

export default UnlockCode;