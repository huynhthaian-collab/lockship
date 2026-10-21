import { Router } from "express";
import { body } from "express-validator";
import * as authController from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { validateRequest } from "../middleware/validate.middleware.js";
import {
    loginRateLimiter,
    otpResendRateLimiter,
    otpVerificationRateLimiter,
    passwordResetRateLimiter,
    registerRateLimiter,
} from "../middleware/rate-limit.middleware.js";

const router = Router();

router.get("/google", loginRateLimiter, authController.googleLogin);
router.get("/google/callback", authController.googleCallback);
router.post(
    "/google/complete-profile",
    [
        body("role").isString().trim().toLowerCase().isIn(["owner", "shipper"]).withMessage("Invalid role."),
        body("address").isString().trim().isLength({ min: 3, max: 500 }).withMessage("Address must be 3 to 500 characters."),
    ],
    validateRequest,
    authController.completeGoogleProfile,
);

router.post(
    "/register",
    registerRateLimiter,
    [
        body("name").trim().isLength({ min: 2, max: 100 }).withMessage("Name must be 2 to 100 characters."),
        body("email").trim().isEmail().withMessage("A valid email is required.").normalizeEmail(),
        body("phone").optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 30 }).withMessage("Phone must be at most 30 characters."),
        body("address").trim().isLength({ min: 3, max: 500 }).withMessage("Address must be 3 to 500 characters."),
        body("role").isString().trim().toLowerCase().isIn(["owner", "shipper"]).withMessage("Invalid role."),
        body("password").isString().isLength({ min: 8, max: 128 }).withMessage("Password must be 8 to 128 characters."),
        body("password").matches(/[A-Za-z]/).withMessage("Password must include at least one letter."),
        body("password").matches(/[0-9]/).withMessage("Password must include at least one number."),
        body("confirmPassword").exists({ values: "falsy" }).withMessage("Confirm password is required."),
        body("confirmPassword").isString().isLength({ min: 8, max: 128 }).withMessage("Confirm password must be 8 to 128 characters."),
        body("confirmPassword").custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error("Passwords do not match.");
            }
            return true;
        }),
    ],
    validateRequest,
    authController.register,
);

router.post(
    "/register/verify",
    otpVerificationRateLimiter,
    [
        body("email").trim().isEmail().withMessage("A valid email is required.").normalizeEmail(),
        body("otp").isString().matches(/^\d{6}$/).withMessage("OTP must contain 6 digits."),
    ],
    validateRequest,
    authController.verifyRegistrationOtp,
);

router.post(
    "/register/resend-otp",
    otpResendRateLimiter,
    [body("email").trim().isEmail().withMessage("A valid email is required.").normalizeEmail()],
    validateRequest,
    authController.resendRegistrationOtp,
);

router.post(
    "/login",
    loginRateLimiter,
    [
        body("email").trim().isEmail().withMessage("A valid email is required.").normalizeEmail(),
        body("password").isString().isLength({ min: 1, max: 128 }).withMessage("Password is required."),
    ],
    validateRequest,
    authController.login,
);

router.get("/me", authenticate, authController.getCurrentUser);

router.post("/logout", authController.logout);

router.put(
    "/profile",
    authenticate,
    [
        body("name").optional().isString().trim().isLength({ min: 2, max: 100 }).withMessage("Name must be 2 to 100 characters."),
        body("phone").optional({ nullable: true }).isString().trim().isLength({ max: 30 }).withMessage("Phone must be at most 30 characters."),
        body("address").optional().isString().trim().isLength({ min: 3, max: 500 }).withMessage("Address must be 3 to 500 characters."),
        body("avatar").optional({ nullable: true }).isString().trim().isLength({ max: 2048 }).withMessage("Avatar must be at most 2048 characters."),
        body().custom((value) => {
            const allowedFields = ["name", "phone", "address", "avatar"];
            if (!value || typeof value !== "object" || Array.isArray(value)
                || !Object.keys(value).some((field) => allowedFields.includes(field))) {
                throw new Error("At least one profile field is required.");
            }
            if (Object.keys(value).some((field) => !allowedFields.includes(field))) {
                throw new Error("Only name, phone, address, and avatar can be updated.");
            }
            return true;
        }),
    ],
    validateRequest,
    authController.updateProfile,
);

router.put(
    "/change-password",
    authenticate,
    [
        body("currentPassword").isString().isLength({ min: 1, max: 128 }).withMessage("Current password is required."),
        body("newPassword").isString().isLength({ min: 8, max: 128 }).withMessage("New password must be 8 to 128 characters."),
        body("newPassword").matches(/[A-Za-z]/).withMessage("Password must include at least one letter."),
        body("newPassword").matches(/[0-9]/).withMessage("Password must include at least one number."),
    ],
    validateRequest,
    authController.changePassword,
);

router.post(
    "/forgot-password",
    passwordResetRateLimiter,
    [body("email").trim().isEmail().withMessage("A valid email is required.").normalizeEmail()],
    validateRequest,
    authController.forgotPassword,
);

router.post(
    "/forgot-password/verify",
    otpVerificationRateLimiter,
    [
        body("email").trim().isEmail().withMessage("A valid email is required.").normalizeEmail(),
        body("otp").isString().matches(/^\d{6}$/).withMessage("OTP must contain 6 digits."),
    ],
    validateRequest,
    authController.verifyForgotPasswordOtp,
);

router.post(
    "/forgot-password/resend-otp",
    otpResendRateLimiter,
    [body("email").trim().isEmail().withMessage("A valid email is required.").normalizeEmail()],
    validateRequest,
    authController.resendForgotPasswordOtp,
);

router.post(
    "/reset-password",
    passwordResetRateLimiter,
    [
        body().custom((value) => {
            const resetToken = value?.resetToken ?? value?.token;
            if (typeof resetToken !== "string" || !/^[a-f0-9]{64}$/i.test(resetToken)) {
                throw new Error("A valid reset token is required.");
            }
            return true;
        }),
        body("newPassword").isString().isLength({ min: 8, max: 128 }).withMessage("New password must be 8 to 128 characters."),
        body("newPassword").matches(/[A-Za-z]/).withMessage("Password must include at least one letter."),
        body("newPassword").matches(/[0-9]/).withMessage("Password must include at least one number."),
    ],
    validateRequest,
    authController.resetPassword,
);

export default router;