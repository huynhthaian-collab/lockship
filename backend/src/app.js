import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { corsOptions, isOriginAllowed } from "./config/cors.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { notFound } from "./middleware/not-found.middleware.js";
import { apiRateLimiter } from "./middleware/rate-limit.middleware.js";
import { sanitizeInputs } from "./middleware/sanitize.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import deliveryRoutes from "./routes/delivery.routes.js";
import iotRoutes from "./routes/iot.routes.js";
import feedbackRoutes from "./routes/feedback.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import userRoutes from "./routes/user.routes.js";
import vehicleRoutes from "./routes/vehicle.routes.js";
import { sendSuccess } from "./utils/api-response.js";
import { readAuthCookie } from "./utils/auth-cookie.js";

const app = express();

app.disable("x-powered-by");
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// Robust CORS Middleware - executed before all route handlers
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: false, limit: "10kb" }));
app.use(sanitizeInputs);
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

// CSRF & Request Origin Protection for mutating requests
app.use((req, res, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
        return next();
    }
    const origin = req.get("origin");
    if ((origin && !isOriginAllowed(origin)) || (!origin && readAuthCookie(req))) {
        return res.status(403).json({
            success: false,
            message: "Request origin is not allowed.",
            data: { errorCode: "INVALID_REQUEST_ORIGIN" },
        });
    }
    return next();
});

app.get("/health", (_req, res) => sendSuccess(res, { message: "LOCKSHIP API is healthy." }));

app.use("/api", apiRateLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/deliveries", deliveryRoutes);
app.use("/api/orders", deliveryRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/feedbacks", feedbackRoutes);
app.use("/api/v1/feedbacks", feedbackRoutes);
app.use("/api/iot", iotRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;