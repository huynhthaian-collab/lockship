import mongoose from "mongoose";

const vehicleSchema = new mongoose.Schema(
    {
        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        plateNumber: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true,
            minlength: 2,
            maxlength: 20,
        },
        type: {
            type: String,
            required: true,
            trim: true,
            maxlength: 50,
        },
        model: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },
        iotDeviceId: {
            type: String,
            trim: true,
            maxlength: 100,
            default: null,
        },
        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active",
            required: true,
        },
    },
    { timestamps: true },
);

vehicleSchema.index({ ownerId: 1, createdAt: -1 });

const Vehicle = mongoose.model("Vehicle", vehicleSchema);

export default Vehicle;