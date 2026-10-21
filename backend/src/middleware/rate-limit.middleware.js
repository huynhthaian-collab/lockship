import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

const isTestEnv = () => env.NODE_ENV === "test" || process.env.NODE_ENV === "test";
const standardOptions = {
    windowMs: 15 * 60 * 1000,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skip: isTestEnv,
};

function createAuthRateLimiter({ developmentLimit, productionLimit, message, errorCode }) {
    return rateLimit({
        ...standardOptions,
        limit: env.NODE_ENV === "development" ? developmentLimit : productionLimit,
        message: {
            success: false,
            message,
            data: { errorCode },
        },
    });
}

export const apiRateLimiter = rateLimit({
    ...standardOptions,
    limit: 1000,
    message: {
        success: false,
        message: "Too many requests from this IP address. Please try again later.",
        data: { errorCode: "RATE_LIMIT_EXCEEDED" },
    },
});

export const loginRateLimiter = createAuthRateLimiter({
    developmentLimit: 20,
    productionLimit: 10,
    message: "Too many login attempts. Please try again later.",
    errorCode: "AUTH_RATE_LIMITED",
});

export const registerRateLimiter = createAuthRateLimiter({
    developmentLimit: 10,
    productionLimit: 5,
    message: "Too many registration attempts. Please try again later.",
    errorCode: "REGISTER_RATE_LIMITED",
});

export const passwordResetRateLimiter = createAuthRateLimiter({
    developmentLimit: 10,
    productionLimit: 5,
    message: "Too many password reset requests. Please try again later.",
    errorCode: "PASSWORD_RESET_RATE_LIMITED",
});

export const otpVerificationRateLimiter = createAuthRateLimiter({
    developmentLimit: 20,
    productionLimit: 10,
    message: "Too many verification attempts. Please try again later.",
    errorCode: "OTP_RATE_LIMITED",
});

export const otpResendRateLimiter = rateLimit({
    ...standardOptions,
    windowMs: 60 * 1000,
    limit: 10,
    message: {
        success: false,
        message: "Too many verification code requests. Please try again later.",
        data: { errorCode: "OTP_RESEND_RATE_LIMIT_EXCEEDED" },
    },
});

export const unlockRateLimiter = rateLimit({
    ...standardOptions,
    limit: 20,
    message: {
        success: false,
        message: "Too many unlock attempts from this IP address.",
        data: { errorCode: "UNLOCK_RATE_LIMIT_EXCEEDED" },
    },
});
