import { randomBytes, timingSafeEqual } from "node:crypto";
import jwt from "jsonwebtoken";
import * as authService from "../services/auth.service.js";
import { env } from "../config/env.js";
import { sendSuccess } from "../utils/api-response.js";
import { AUTH_COOKIE_NAME, authCookieOptions, clearAuthCookie, readAuthCookie } from "../utils/auth-cookie.js";

const GOOGLE_STATE_COOKIE = "lockship_google_state";
const GOOGLE_PROFILE_COOKIE = "lockship_google_profile";
const GOOGLE_OAUTH_TTL_MS = 10 * 60 * 1000;

function googleStateCookieOptions() {
    return {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: GOOGLE_OAUTH_TTL_MS,
        path: "/api/auth/google",
    };
}

function googleProfileCookieOptions() {
    const secure = env.NODE_ENV === "production";
    return {
        httpOnly: true,
        secure,
        sameSite: secure ? "none" : "lax",
        maxAge: GOOGLE_OAUTH_TTL_MS,
        path: "/api/auth/google/complete-profile",
    };
}

function readCookie(req, name) {
    const cookieHeader = req.get("cookie") ?? "";
    const cookie = cookieHeader
        .split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith(`${name}=`));
    if (!cookie) {
        return null;
    }
    try {
        return decodeURIComponent(cookie.slice(name.length + 1)) || null;
    } catch {
        return null;
    }
}

function getClientBaseUrl() {
    const raw = process.env.CLIENT_URL || env.CLIENT_URL || "https://lockship-gamma.vercel.app";
    const unquoted = String(raw).trim().replace(/^['"]|['"]$/g, "");
    const candidate = unquoted.split(",")[0].trim().replace(/\/+$/, "");
    if (!candidate) return "https://lockship-gamma.vercel.app";
    try {
        const parsed = new URL(candidate.startsWith("http") ? candidate : `https://${candidate}`);
        return parsed.origin;
    } catch {
        return "https://lockship-gamma.vercel.app";
    }
}

function loginRedirect(res, errorCode) {
    const clientUrl = getClientBaseUrl();
    const target = new URL("/login", clientUrl);
    if (errorCode) {
        target.searchParams.set("googleError", errorCode);
    }
    return res.redirect(target.toString());
}

function frontendRedirect(res, path) {
    const clientUrl = getClientBaseUrl();
    return res.redirect(new URL(path, clientUrl).toString());
}

function matchingState(expected, received) {
    if (typeof expected !== "string" || typeof received !== "string") {
        return false;
    }
    const expectedBytes = Buffer.from(expected);
    const receivedBytes = Buffer.from(received);
    return expectedBytes.length === receivedBytes.length && timingSafeEqual(expectedBytes, receivedBytes);
}

function knownGoogleError(error) {
    const knownCodes = new Set([
        "GOOGLE_EMAIL_NOT_VERIFIED",
        "GOOGLE_ACCOUNT_UNAVAILABLE",
        "GOOGLE_ACCOUNT_CONFLICT",
    ]);
    return knownCodes.has(error?.errorCode) ? error.errorCode.toLowerCase() : "google_login_failed";
}

export async function register(req, res) {
    await authService.registerUser(req.body);
    return sendSuccess(res, {
        statusCode: 201,
        message: "OTP has been sent to your email.",
    });
}

export async function login(req, res) {
    const result = await authService.loginUser(req.body);
    res.cookie(AUTH_COOKIE_NAME, result.token, authCookieOptions());
    return sendSuccess(res, {
        message: "Login successful.",
        data: { user: result.user, sessionExpiresAt: result.sessionExpiresAt },
    });
}

export async function googleLogin(req, res) {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
        return loginRedirect(res, "google_not_configured");
    }

    const state = randomBytes(32).toString("hex");
    res.cookie(GOOGLE_STATE_COOKIE, state, googleStateCookieOptions());
    return res.redirect(authService.createGoogleAuthorizationUrl(state));
}

export async function googleCallback(req, res) {
    const savedState = readCookie(req, GOOGLE_STATE_COOKIE);
    const receivedState = typeof req.query.state === "string" ? req.query.state : null;
    res.clearCookie(GOOGLE_STATE_COOKIE, googleStateCookieOptions());
    res.clearCookie(GOOGLE_PROFILE_COOKIE, googleProfileCookieOptions());

    if (!matchingState(savedState, receivedState)) {
        return loginRedirect(res, "google_invalid_state");
    }
    if (typeof req.query.error === "string") {
        return loginRedirect(res, req.query.error === "access_denied" ? "google_cancelled" : "google_login_failed");
    }
    if (typeof req.query.code !== "string" || !req.query.code) {
        return loginRedirect(res, "google_login_failed");
    }

    try {
        const profile = await authService.verifyGoogleAuthorizationCode(req.query.code);
        const session = await authService.loginWithGoogle(profile);
        if (session) {
            res.cookie(AUTH_COOKIE_NAME, session.token, authCookieOptions());
            const clientUrl = getClientBaseUrl();
            return res.redirect(`${clientUrl}/dashboard?token=${encodeURIComponent(session.token)}`);
        }

        clearAuthCookie(res);
        const pendingToken = jwt.sign(
            { purpose: "google-profile", profile },
            env.JWT_SECRET,
            { expiresIn: "10m" },
        );
        res.cookie(GOOGLE_PROFILE_COOKIE, pendingToken, googleProfileCookieOptions());
        const clientUrl = getClientBaseUrl();
        return res.redirect(`${clientUrl}/google/complete-profile`);
    } catch (error) {
        if (!error?.errorCode) {
            console.error("Google OAuth callback failed.", error);
        }
        return loginRedirect(res, knownGoogleError(error));
    }
}

export async function completeGoogleProfile(req, res) {
    const pendingToken = readCookie(req, GOOGLE_PROFILE_COOKIE);
    let payload;
    try {
        payload = pendingToken ? jwt.verify(pendingToken, env.JWT_SECRET) : null;
    } catch (error) {
        if (!(error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError)) {
            throw error;
        }
        res.clearCookie(GOOGLE_PROFILE_COOKIE, googleProfileCookieOptions());
        return res.status(401).json({
            success: false,
            message: "Google profile completion has expired. Please sign in again.",
            data: { errorCode: "GOOGLE_PROFILE_EXPIRED" },
        });
    }

    if (
        !payload
        || typeof payload === "string"
        || payload.purpose !== "google-profile"
        || typeof payload.profile?.googleId !== "string"
        || typeof payload.profile?.email !== "string"
        || typeof payload.profile?.name !== "string"
    ) {
        res.clearCookie(GOOGLE_PROFILE_COOKIE, googleProfileCookieOptions());
        return res.status(401).json({
            success: false,
            message: "Google profile completion has expired. Please sign in again.",
            data: { errorCode: "GOOGLE_PROFILE_EXPIRED" },
        });
    }

    const session = await authService.completeGoogleProfile(payload.profile, req.body);
    res.clearCookie(GOOGLE_PROFILE_COOKIE, googleProfileCookieOptions());
    res.cookie(AUTH_COOKIE_NAME, session.token, authCookieOptions());
    return sendSuccess(res, {
        message: "Google sign in successful.",
        data: { user: session.user, sessionExpiresAt: session.sessionExpiresAt },
    });
}

export async function getCurrentUser(req, res) {
    return sendSuccess(res, {
        message: "Current user retrieved successfully.",
        data: { user: req.user, sessionExpiresAt: req.authPayload.exp * 1000 },
    });
}

export async function logout(req, res) {
    try {
        await authService.logoutUser(readAuthCookie(req));
    } finally {
        clearAuthCookie(res);
    }
    return sendSuccess(res, { message: "Logout successful." });
}

export async function updateProfile(req, res) {
    const user = await authService.updateUserProfile(req.user.id, req.body);
    return sendSuccess(res, {
        message: "Profile updated successfully.",
        data: { user },
    });
}

export async function changePassword(req, res) {
    await authService.changeUserPassword(
        req.user.id,
        req.body.currentPassword,
        req.body.newPassword,
    );
    return sendSuccess(res, { message: "Password changed successfully." });
}

export async function forgotPassword(req, res) {
    await authService.requestPasswordReset(req.body.email);
    return sendSuccess(res, {
        message: "If the email is associated with an account, a verification code has been sent.",
    });
}

export async function verifyRegistrationOtp(req, res) {
    await authService.verifyRegistrationOtp(req.body.email, req.body.otp);
    return sendSuccess(res, { message: "Email verified. You can now sign in." });
}

export async function resendRegistrationOtp(req, res) {
    await authService.resendRegistrationOtp(req.body.email);
    return sendSuccess(res, { message: "OTP has been sent to your email." });
}

export async function verifyForgotPasswordOtp(req, res) {
    const result = await authService.verifyForgotPasswordOtp(req.body.email, req.body.otp);
    return sendSuccess(res, {
        message: "Verification successful.",
        data: result,
    });
}

export async function resendForgotPasswordOtp(req, res) {
    await authService.resendForgotPasswordOtp(req.body.email);
    return sendSuccess(res, {
        message: "If the email is associated with an account, a verification code has been sent.",
    });
}

export async function resetPassword(req, res) {
    await authService.resetUserPassword(req.body.resetToken ?? req.body.token, req.body.newPassword);
    return sendSuccess(res, { message: "Password reset successfully." });
}