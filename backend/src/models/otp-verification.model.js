import mongoose from "mongoose";

const otpVerificationSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            maxlength: 254,
        },
        otpHash: {
            type: String,
            required: true,
            select: false,
        },
        purpose: {
            type: String,
            enum: ["REGISTER", "FORGOT_PASSWORD"],
            required: true,
        },
        attempts: {
            type: Number,
            default: 0,
            min: 0,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
        verified: {
            type: Boolean,
            default: false,
        },
        resendAvailableAt: {
            type: Date,
            required: true,
        },
    },
    { timestamps: true },
);

otpVerificationSchema.index({ email: 1, purpose: 1 }, { unique: true });
otpVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("OtpVerification", otpVerificationSchema);
