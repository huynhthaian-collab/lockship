import { randomBytes, randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import OtpVerification from "../models/otp-verification.model.js";
import RevokedToken from "../models/revoked-token.model.js";
import { env } from "../config/env.js";
import AppError from "../utils/app-error.js";
import { sendVerificationOtpEmail } from "./email.service.js";
import { hashToken } from "../utils/token.js";
import { disconnectUserSockets, disconnectUserToken } from "./socket.service.js";

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const googleOAuthClient = new OAuth2Client(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_CALLBACK_URL,
);

function createSession(user) {
    const token = createToken(user);
    const claims = jwt.decode(token);
    return { user, token, sessionExpiresAt: claims.exp * 1000 };
}

export function createGoogleAuthorizationUrl(state) {
    return googleOAuthClient.generateAuthUrl({
        access_type: "online",
        include_granted_scopes: true,
        prompt: "select_account",
        scope: ["openid", "email", "profile"],
        state,
    });
}

export async function verifyGoogleAuthorizationCode(code) {
    const { tokens } = await googleOAuthClient.getToken(code);
    if (!tokens.id_token) {
        throw new AppError("Google did not return a valid identity token.", 401, null, "GOOGLE_LOGIN_FAILED");
    }

    const ticket = await googleOAuthClient.verifyIdToken({
        idToken: tokens.id_token,
        audience: env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || payload.email_verified !== true) {
        throw new AppError("A verified Google email is required.", 403, null, "GOOGLE_EMAIL_NOT_VERIFIED");
    }
    if (
        typeof payload.sub !== "string"
        || typeof payload.email !== "string"
        || payload.email.trim().length > 254
        || !payload.email.includes("@")
    ) {
        throw new AppError("Google did not return a valid account.", 401, null, "GOOGLE_LOGIN_FAILED");
    }

    const email = payload.email.trim().toLowerCase();
    const displayName = typeof payload.name === "string" ? payload.name.trim() : "";
    const name = displayName.length >= 2 ? displayName.slice(0, 100) : "Google User";
    return {
        googleId: payload.sub,
        email,
        name,
        picture: typeof payload.picture === "string" ? payload.picture : null,
    };
}

async function findOrLinkGoogleAccount(profile) {
    const userQuery = User.findOne({ googleId: profile.googleId })
        .select("+googleId +password +registrationPending +tokenVersion");
    let user = await userQuery;
    if (user) {
        if (user.status !== "active" || user.registrationPending) {
            throw new AppError("This account is not available for sign in.", 403, null, "GOOGLE_ACCOUNT_UNAVAILABLE");
        }
        if (user.authProvider === "local" && user.googleId) {
            user.authProvider = user.password ? "local_google" : "google";
            await user.save();
        }
        return user;
    }

    user = await User.findOne({ email: profile.email })
        .select("+googleId +password +registrationPending +tokenVersion");
    if (!user) {
        return null;
    }
    if (user.status !== "active" || user.registrationPending) {
        throw new AppError("This account is not available for sign in.", 403, null, "GOOGLE_ACCOUNT_UNAVAILABLE");
    }
    if (user.googleId && user.googleId !== profile.googleId) {
        throw new AppError("This email is linked to a different Google account.", 409, null, "GOOGLE_ACCOUNT_CONFLICT");
    }

    user.googleId = profile.googleId;
    user.authProvider = user.password ? "local_google" : "google";
    if (!user.avatar && profile.picture) {
        user.avatar = profile.picture;
    }
    await user.save();
    return user;
}

export async function loginWithGoogle(profile) {
    const user = await findOrLinkGoogleAccount(profile);
    return user ? createSession(user) : null;
}

export async function completeGoogleProfile(profile, { role, address }) {
    const normalizedRole = typeof role === "string" ? role.trim().toLowerCase() : "";
    if (!["owner", "shipper"].includes(normalizedRole)) {
        throw new AppError("Invalid role.", 400, null, "INVALID_ROLE");
    }
    const normalizedAddress = typeof address === "string" ? address.trim() : "";
    if (normalizedAddress.length < 3 || normalizedAddress.length > 500) {
        throw new AppError("Address must be 3 to 500 characters.", 400, null, "INVALID_ADDRESS");
    }

    try {
        let user = await findOrLinkGoogleAccount(profile);
        if (!user) {
            user = await User.create({
                name: profile.name,
                email: profile.email,
                googleId: profile.googleId,
                authProvider: "google",
                avatar: profile.picture,
                role: normalizedRole,
                address: normalizedAddress,
                status: "active",
            });
        }
        return createSession(user);
    } catch (error) {
        if (error?.code !== 11000) {
            throw error;
        }
        const user = await findOrLinkGoogleAccount(profile);
        if (!user) {
            throw new AppError("Unable to create this Google account.", 409, null, "GOOGLE_ACCOUNT_CONFLICT");
        }
        return createSession(user);
    }
}

function createToken(user) {
    return jwt.sign({ ver: user.tokenVersion ?? 0 }, env.JWT_SECRET, {
        subject: user.id,
        expiresIn: "15m",
    });
}

async function issueOtp(email, purpose) {
    const now = new Date();
    const current = await OtpVerification.findOne({ email, purpose }).select("+otpHash");
    if (current && current.resendAvailableAt > now && current.expiresAt > now) {
        throw new AppError("Please wait before requesting another verification code.", 429, null, "OTP_RESEND_COOLDOWN");
    }

    let otp;
    do {
        otp = String(randomInt(0, 1_000_000)).padStart(6, "0");
    } while (current && await bcrypt.compare(otp, current.otpHash));
    const otpHash = await bcrypt.hash(otp, env.BCRYPT_SALT_ROUNDS);
    const verification = current ?? new OtpVerification({ email, purpose });
    verification.otpHash = otpHash;
    verification.attempts = 0;
    verification.expiresAt = new Date(now.getTime() + OTP_TTL_MS);
    verification.resendAvailableAt = new Date(now.getTime() + OTP_RESEND_COOLDOWN_MS);
    verification.verified = false;
    await verification.save();

    try {
        await sendVerificationOtpEmail(email, otp, purpose);
    } catch (error) {
        await OtpVerification.deleteOne({ _id: verification._id });
        console.error("OTP email delivery failed.", error);
        throw new AppError("Email delivery is temporarily unavailable.", 503, null, "OTP_EMAIL_DELIVERY_FAILED");
    }
}

export async function registerUser({ name, email, password, confirmPassword, phone, address, role }) {
    if (typeof confirmPassword !== "string" || confirmPassword !== password) {
        throw new AppError("Passwords do not match.", 400, null, "INVALID_CONFIRM_PASSWORD");
    }

    const normalizedRole = typeof role === "string" ? role.trim().toLowerCase() : "";
    const allowedRoles = new Set(["owner", "shipper"]);
    if (!allowedRoles.has(normalizedRole)) {
        throw new AppError("Invalid role.", 400, null, "INVALID_ROLE");
    }

    const normalizedAddress = typeof address === "string" ? address.trim() : "";
    if (!normalizedAddress || normalizedAddress.length < 3 || normalizedAddress.length > 500) {
        throw new AppError("Address must be 3 to 500 characters.", 400, null, "INVALID_ADDRESS");
    }

    const existingUser = await User.exists({ email });
    if (existingUser) {
        const pendingUser = await User.exists({ _id: existingUser._id, registrationPending: true });
        if (pendingUser) {
            throw new AppError("Email verification is already pending. Request a new code.", 409, null, "REGISTRATION_PENDING");
        }
        throw new AppError("An account with this email already exists.", 409);
    }

    const user = await User.create({
        name,
        email,
        password,
        phone,
        address: normalizedAddress,
        role: normalizedRole,
        status: "inactive",
        registrationPending: true,
    });
    try {
        await issueOtp(email, "REGISTER");
    } catch (error) {
        await User.deleteOne({ _id: user._id, registrationPending: true });
        throw error;
    }
}

export async function registerUserWithoutOtpForLegacyTests({ name, email, password, phone, address, role }) {
    const normalizedRole = typeof role === "string" ? role.trim().toLowerCase() : "";
    const allowedRoles = new Set(["owner", "shipper"]);
    if (!allowedRoles.has(normalizedRole)) {
        throw new AppError("Invalid role.", 400, null, "INVALID_ROLE");
    }

    const normalizedAddress = typeof address === "string" ? address.trim() : "";
    if (!normalizedAddress || normalizedAddress.length < 3 || normalizedAddress.length > 500) {
        throw new AppError("Address must be 3 to 500 characters.", 400, null, "INVALID_ADDRESS");
    }

    const user = await User.create({
        name,
        email,
        password,
        phone,
        address: normalizedAddress,
        role: normalizedRole,
        status: "active",
    });

    return user;
}

export async function resendRegistrationOtp(email) {
    const user = await User.findOne({ email }).select("+registrationPending");
    if (!user || !user.registrationPending) {
        throw new AppError("No pending registration was found for this email.", 404, null, "REGISTRATION_NOT_PENDING");
    }
    await issueOtp(email, "REGISTER");
}

async function verifyOtp(email, purpose, otp) {
    const verification = await OtpVerification.findOne({
        email,
        purpose,
        verified: false,
        expiresAt: { $gt: new Date() },
    }).select("+otpHash");

    if (!verification) {
        throw new AppError("The verification code is invalid or expired.", 400, null, "OTP_EXPIRED");
    }
    if (verification.attempts >= OTP_MAX_ATTEMPTS) {
        throw new AppError("Too many incorrect attempts. Request a new code.", 429, null, "OTP_MAX_ATTEMPTS");
    }

    if (!(await bcrypt.compare(otp, verification.otpHash))) {
        const updated = await OtpVerification.findOneAndUpdate(
            { _id: verification._id, attempts: { $lt: OTP_MAX_ATTEMPTS }, verified: false },
            { $inc: { attempts: 1 } },
            { new: true },
        );
        if (!updated || updated.attempts >= OTP_MAX_ATTEMPTS) {
            throw new AppError("Too many incorrect attempts. Request a new code.", 429, null, "OTP_MAX_ATTEMPTS");
        }
        throw new AppError("The verification code is incorrect.", 400, null, "INVALID_OTP");
    }

    const consumed = await OtpVerification.findOneAndDelete({
        _id: verification._id,
        verified: false,
        attempts: { $lt: OTP_MAX_ATTEMPTS },
        expiresAt: { $gt: new Date() },
    });
    if (!consumed) {
        throw new AppError("The verification code has already been used or expired.", 400, null, "OTP_EXPIRED");
    }
}

export async function verifyRegistrationOtp(email, otp) {
    await verifyOtp(email, "REGISTER", otp);
    const user = await User.findOneAndUpdate(
        { email, registrationPending: true, status: "inactive" },
        { $set: { status: "active", registrationPending: false } },
        { new: true },
    );
    if (!user) {
        throw new AppError("No pending registration was found for this email.", 404, null, "REGISTRATION_NOT_PENDING");
    }
}

export async function resendForgotPasswordOtp(email) {
    const user = await User.exists({ email, status: "active" });
    if (user) {
        try {
            await issueOtp(email, "FORGOT_PASSWORD");
        } catch (error) {
            if (error.errorCode === "OTP_RESEND_COOLDOWN") {
                return;
            }
            if (error.errorCode === "OTP_EMAIL_DELIVERY_FAILED") {
                return;
            }
            throw error;
        }
    }
}

export async function loginUser({ email, password }) {
    const user = await User.findOne({ email }).select("+password +tokenVersion");
    if (!user || !(await user.comparePassword(password))) {
        throw new AppError("Email or password is incorrect.", 401);
    }

    if (user.status !== "active") {
        throw new AppError("Email or password is incorrect.", 401);
    }

    return createSession(user);
}

export async function logoutUser(token) {
    if (!token) {
        return;
    }
    let payload;
    try {
        payload = jwt.verify(token, env.JWT_SECRET);
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            return;
        }
        throw error;
    }
    if (typeof payload === "string" || typeof payload.exp !== "number") {
        return;
    }
    await RevokedToken.updateOne(
        { tokenHash: hashToken(token) },
        { $setOnInsert: { tokenHash: hashToken(token), expiresAt: new Date(payload.exp * 1000) } },
        { upsert: true },
    );
    disconnectUserToken(token);
}

export async function updateUserProfile(userId, profile) {
    const user = await User.findById(userId);
    if (!user) {
        throw new AppError("User account was not found.", 404);
    }

    for (const field of ["name", "phone", "address", "avatar"]) {
        if (Object.hasOwn(profile, field)) {
            user[field] = profile[field];
        }
    }

    await user.save();
    return user;
}

export async function changeUserPassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select("+password +tokenVersion");
    if (!user) {
        throw new AppError("User account was not found.", 404);
    }

    if (!(await user.comparePassword(currentPassword))) {
        throw new AppError("Current password is incorrect.", 401);
    }

    if (await user.comparePassword(newPassword)) {
        throw new AppError("New password must be different from the current password.", 400);
    }

    user.password = newPassword;
    if (user.authProvider === "google") {
        user.authProvider = "local_google";
    }
    user.tokenVersion += 1;
    await user.save();
    disconnectUserSockets(userId);
}

export async function requestPasswordReset(email) {
    await resendForgotPasswordOtp(email);
}

export async function verifyForgotPasswordOtp(email, otp) {
    const user = await User.findOne({ email, status: "active" }).select("+passwordResetTokenHash +passwordResetExpiresAt");
    if (!user) {
        throw new AppError("The verification code is invalid or expired.", 400, null, "OTP_EXPIRED");
    }
    await verifyOtp(email, "FORGOT_PASSWORD", otp);
    const resetToken = randomBytes(32).toString("hex");
    user.passwordResetTokenHash = hashToken(resetToken);
    user.passwordResetExpiresAt = new Date(Date.now() + env.PASSWORD_RESET_TOKEN_TTL_MINUTES * 60 * 1000);
    await user.save();
    return { resetToken };
}

export async function resetUserPassword(resetToken, newPassword) {
    const user = await User.findOne({
        passwordResetTokenHash: hashToken(resetToken),
        passwordResetExpiresAt: { $gt: new Date() },
        status: "active",
    }).select("+password +passwordResetTokenHash +passwordResetExpiresAt +tokenVersion");

    if (!user) {
        throw new AppError("Password reset token is invalid or expired.", 400);
    }

    user.password = newPassword;
    if (user.authProvider === "google") {
        user.authProvider = "local_google";
    }
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    user.tokenVersion += 1;
    await user.save();
    disconnectUserSockets(user.id);
}