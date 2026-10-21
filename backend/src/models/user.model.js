import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { env } from "../config/env.js";

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 100,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            maxlength: 254,
        },
        password: {
            type: String,
            required() {
                return this.authProvider !== "google";
            },
            minlength: 8,
            select: false,
        },
        googleId: {
            type: String,
            trim: true,
            select: false,
        },
        authProvider: {
            type: String,
            enum: ["local", "google", "local_google"],
            default: "local",
            required: true,
        },
        phone: {
            type: String,
            trim: true,
            maxlength: 30,
            default: null,
        },
        address: {
            type: String,
            required: true,
            trim: true,
            minlength: 3,
            maxlength: 500,
        },
        role: {
            type: String,
            enum: ["owner", "shipper", "admin"],
            default: "owner",
            required: true,
        },
        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        status: {
            type: String,
            enum: ["active", "inactive", "suspended"],
            default: "active",
            required: true,
        },
        registrationPending: {
            type: Boolean,
            default: false,
            select: false,
        },
        avatar: {
            type: String,
            trim: true,
            default: null,
        },
        passwordResetTokenHash: {
            type: String,
            select: false,
            default: null,
        },
        passwordResetExpiresAt: {
            type: Date,
            select: false,
            default: null,
        },
        tokenVersion: {
            type: Number,
            select: false,
            default: 0,
            min: 0,
        },
    },
    {
        timestamps: true,
        toJSON: {
            transform(_document, returnedObject) {
                delete returnedObject.password;
                delete returnedObject.googleId;
                delete returnedObject.passwordResetTokenHash;
                delete returnedObject.passwordResetExpiresAt;
                delete returnedObject.tokenVersion;
                delete returnedObject.registrationPending;
                delete returnedObject.__v;
                return returnedObject;
            },
        },
    },
);

userSchema.index({ ownerId: 1, role: 1, createdAt: -1 });
userSchema.index({ googleId: 1 }, { unique: true, sparse: true });

userSchema.pre("validate", function validateOwnerAssignment() {
    if (this.ownerId && this.role !== "shipper") {
        this.invalidate("ownerId", "Only shippers can be assigned to an owner.");
    }
});

userSchema.pre("save", async function hashPassword() {
    if (!this.isModified("password")) {
        return;
    }

    this.password = await bcrypt.hash(this.password, env.BCRYPT_SALT_ROUNDS);
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
    if (typeof candidatePassword !== "string" || typeof this.password !== "string") {
        return Promise.resolve(false);
    }
    return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;