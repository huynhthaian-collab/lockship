import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import AppError from "../utils/app-error.js";

function createTransporter() {
    return nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        requireTLS: !env.SMTP_SECURE,
        ...(env.SMTP_USER && env.SMTP_PASS
            ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } }
            : {}),
    });
}

export async function sendVerificationOtpEmail(email, otp, purpose) {
    if (!env.SMTP_HOST || !env.SMTP_FROM) {
        throw new AppError("Email delivery is not configured.", 503);
    }

    const isRegistration = purpose === "REGISTER";
    const subject = isRegistration
        ? "LockShip - Verify Your Email"
        : "LockShip - Password Reset Code";
    const transporter = createTransporter();
    await transporter.sendMail({
        from: env.SMTP_FROM,
        to: email,
        subject,
        text: `Your LockShip verification code is ${otp}. This code expires in 5 minutes. If you did not request this code, you can safely ignore this email.`,
        html: `<!doctype html><html><body style="margin:0;padding:32px 16px;background:#f5f7fb;font-family:Arial,sans-serif;color:#111827"><main style="max-width:520px;margin:0 auto;padding:32px;border:1px solid #e5e7eb;border-radius:16px;background:#fff"><p style="margin:0;color:#2563eb;font-size:13px;font-weight:bold;letter-spacing:1px">LOCKSHIP</p><h1 style="margin:24px 0 8px;font-size:24px">${isRegistration ? "Verify your email" : "Reset your password"}</h1><p style="margin:0;color:#64748b;line-height:1.6">Your verification code is:</p><p style="margin:24px 0;padding:18px;border-radius:12px;background:#eff6ff;color:#1d4ed8;text-align:center;font-size:32px;font-weight:bold;letter-spacing:10px">${otp}</p><p style="color:#64748b;line-height:1.6">This code expires in 5 minutes and can only be used once.</p><p style="margin:24px 0 0;color:#94a3b8;font-size:12px">If you did not request this code, you can safely ignore this email.</p></main></body></html>`,
    });
}

export async function sendUnlockCodeEmail(email, code, expiresAt) {
    if (!env.SMTP_HOST || !env.SMTP_FROM) {
        throw new AppError("Unlock code email delivery is not configured.", 503);
    }

    const transporter = createTransporter();
    await transporter.sendMail({
        from: env.SMTP_FROM,
        to: email,
        subject: "LOCKSHIP delivery unlock code",
        text: `Your one-time unlock code is ${code}. It expires at ${expiresAt.toISOString()}. Do not share it with anyone other than the delivery owner.`,
    });
}