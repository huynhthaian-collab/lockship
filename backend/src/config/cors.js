import { env } from "./env.js";

/**
 * Standard Allowed Origins for Lockship API
 * Supports production domains, all Vercel preview branches, and local dev ports
 */
export const allowedOrigins = [
    "https://lockship-gamma.vercel.app",
    /\.vercel\.app$/, // Allow all Vercel production & preview branches
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:4173",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
];

/**
 * Evaluates whether an incoming HTTP/WebSocket origin is permitted
 */
export function isOriginAllowed(origin) {
    // Allow non-browser requests (Postman, curl, native mobile, server-to-server)
    if (!origin) return true;

    // Support wildcard config
    if (process.env.CORS_ORIGIN === "*" || env.CORS_ORIGIN === "*") {
        return true;
    }

    // Configured origins from environment variables (CORS_ORIGIN, CLIENT_URL)
    const envOrigins = [
        ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : []),
        ...(process.env.CLIENT_URL ? process.env.CLIENT_URL.split(",") : []),
        ...(env.CORS_ORIGIN ? env.CORS_ORIGIN.split(",") : []),
        ...(env.CLIENT_URL ? env.CLIENT_URL.split(",") : []),
    ]
        .map((item) => item.trim())
        .filter(Boolean);

    if (envOrigins.includes(origin) || envOrigins.includes("*")) {
        return true;
    }

    // Check predefined list and regular expressions
    return allowedOrigins.some((allowed) => {
        if (allowed instanceof RegExp) {
            return allowed.test(origin);
        }
        return allowed === origin;
    });
}

/**
 * Express CORS Middleware Options
 */
export const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || isOriginAllowed(origin)) {
            callback(null, true);
        } else {
            const error = new Error("Not allowed by CORS");
            error.statusCode = 403;
            error.errorCode = "CORS_NOT_ALLOWED";
            callback(error);
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "X-Requested-With"],
};
