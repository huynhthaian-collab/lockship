import dotenv from "dotenv";

dotenv.config();

const port = Number(process.env.PORT ?? 5000);
const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);
const resetTokenTtlMinutes = Number(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES ?? 15);
const clientUrl = process.env.CLIENT_URL ?? process.env.CORS_ORIGIN ?? "http://localhost:5173";
const unlockCodeTtlMinutes = Number(process.env.UNLOCK_CODE_TTL_MINUTES ?? 10);
const unlockCodeMaxAttempts = Number(process.env.UNLOCK_CODE_MAX_ATTEMPTS ?? 5);
const smtpPort = Number(process.env.SMTP_PORT ?? 587);
const jwtSecret = process.env.JWT_SECRET;
const nodeEnv = process.env.NODE_ENV ?? "development";
const smtpHost = process.env.SMTP_HOST ?? "";
const smtpFrom = process.env.EMAIL_FROM ?? process.env.SMTP_FROM ?? "";
const mqttUrl = process.env.MQTT_URL ?? "";
const mqttUsername = process.env.MQTT_USERNAME ?? "";
const mqttPassword = process.env.MQTT_PASSWORD ?? "";
const unlockCodeEncryptionSecret = process.env.UNLOCK_CODE_ENCRYPTION_KEY ?? jwtSecret;
const mqttOfflineAfterSeconds = Number(process.env.MQTT_OFFLINE_AFTER_SECONDS ?? 90);
const mqttDeviceTokenSecret = process.env.MQTT_DEVICE_TOKEN_SECRET ?? jwtSecret;
const mqttDeviceTokenTtl = process.env.MQTT_DEVICE_TOKEN_TTL ?? "365d";
const googleClientId = process.env.GOOGLE_CLIENT_ID ?? "";
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";
const googleCallbackUrl = process.env.GOOGLE_CALLBACK_URL ?? `http://localhost:${port}/api/auth/google/callback`;

if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must be set and contain at least 32 characters.");
}

if (unlockCodeEncryptionSecret.length < 32) {
    throw new Error("UNLOCK_CODE_ENCRYPTION_KEY must contain at least 32 characters.");
}

if (Boolean(googleClientId) !== Boolean(googleClientSecret)) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must both be set or both be empty.");
}

let parsedGoogleCallbackUrl;
try {
    parsedGoogleCallbackUrl = new URL(googleCallbackUrl);
} catch {
    throw new Error("GOOGLE_CALLBACK_URL must be a valid URL.");
}

if (nodeEnv === "production" && googleClientId && parsedGoogleCallbackUrl.protocol !== "https:") {
    throw new Error("GOOGLE_CALLBACK_URL must use HTTPS in production.");
}

if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
}

if (!Number.isInteger(saltRounds) || saltRounds < 10 || saltRounds > 14) {
    throw new Error("BCRYPT_SALT_ROUNDS must be an integer between 10 and 14.");
}

if (!Number.isInteger(resetTokenTtlMinutes) || resetTokenTtlMinutes < 5 || resetTokenTtlMinutes > 60) {
    throw new Error("PASSWORD_RESET_TOKEN_TTL_MINUTES must be between 5 and 60.");
}

if (!Number.isInteger(unlockCodeTtlMinutes) || unlockCodeTtlMinutes < 1 || unlockCodeTtlMinutes > 60) {
    throw new Error("UNLOCK_CODE_TTL_MINUTES must be between 1 and 60.");
}

if (!Number.isInteger(unlockCodeMaxAttempts) || unlockCodeMaxAttempts < 1 || unlockCodeMaxAttempts > 10) {
    throw new Error("UNLOCK_CODE_MAX_ATTEMPTS must be between 1 and 10.");
}

if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
    throw new Error("SMTP_PORT must be an integer between 1 and 65535.");
}

if (nodeEnv === "production" && (!smtpHost || !smtpFrom)) {
    throw new Error("SMTP_HOST and EMAIL_FROM (or SMTP_FROM) must be set in production.");
}

if (nodeEnv === "production" && !process.env.CLIENT_URL) {
    throw new Error("CLIENT_URL must be set in production.");
}

if (mqttUrl) {
    const parsedMqttUrl = new URL(mqttUrl);
    if (!["mqtt:", "mqtts:"].includes(parsedMqttUrl.protocol)) {
        throw new Error("MQTT_URL must use the mqtt:// or mqtts:// protocol.");
    }
    if (!mqttUsername || !mqttPassword) {
        throw new Error("MQTT_USERNAME and MQTT_PASSWORD are required when MQTT_URL is set.");
    }
    if (nodeEnv === "production" && parsedMqttUrl.protocol !== "mqtts:") {
        throw new Error("MQTT_URL must use mqtts:// in production.");
    }
}

if (nodeEnv === "production" && !mqttUrl) {
    throw new Error("MQTT_URL must be set in production.");
}

if (!Number.isInteger(mqttOfflineAfterSeconds) || mqttOfflineAfterSeconds < 10 || mqttOfflineAfterSeconds > 3600) {
    throw new Error("MQTT_OFFLINE_AFTER_SECONDS must be between 10 and 3600.");
}

if (mqttDeviceTokenSecret.length < 32) {
    throw new Error("MQTT_DEVICE_TOKEN_SECRET must contain at least 32 characters.");
}

if (!/^\d+[smhd]$/.test(mqttDeviceTokenTtl)) {
    throw new Error("MQTT_DEVICE_TOKEN_TTL must use a numeric duration such as 365d.");
}

if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI must be set.");
}

export const env = Object.freeze({
    NODE_ENV: nodeEnv,
    PORT: port,
    MONGODB_URI: process.env.MONGODB_URI,
    JWT_SECRET: jwtSecret,
    UNLOCK_CODE_ENCRYPTION_KEY: unlockCodeEncryptionSecret,
    JWT_EXPIRES_IN: "15m",
    BCRYPT_SALT_ROUNDS: saltRounds,
    CLIENT_URL: clientUrl,
    CORS_ORIGIN: clientUrl,
    PASSWORD_RESET_TOKEN_TTL_MINUTES: resetTokenTtlMinutes,
    UNLOCK_CODE_TTL_MINUTES: unlockCodeTtlMinutes,
    UNLOCK_CODE_MAX_ATTEMPTS: unlockCodeMaxAttempts,
    SMTP_HOST: smtpHost,
    SMTP_PORT: smtpPort,
    SMTP_SECURE: process.env.SMTP_SECURE === "true",
    SMTP_USER: process.env.SMTP_USER ?? "",
    SMTP_PASS: process.env.SMTP_PASS ?? "",
    SMTP_FROM: smtpFrom,
    MQTT_URL: mqttUrl,
    MQTT_USERNAME: mqttUsername,
    MQTT_PASSWORD: mqttPassword,
    MQTT_CLIENT_ID: process.env.MQTT_CLIENT_ID ?? "lockship-backend",
    MQTT_DEVICE_TOKEN_SECRET: mqttDeviceTokenSecret,
    MQTT_DEVICE_TOKEN_TTL: mqttDeviceTokenTtl,
    MQTT_OFFLINE_AFTER_SECONDS: mqttOfflineAfterSeconds,
    GOOGLE_CLIENT_ID: googleClientId,
    GOOGLE_CLIENT_SECRET: googleClientSecret,
    GOOGLE_CALLBACK_URL: googleCallbackUrl,
});