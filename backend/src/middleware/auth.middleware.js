import jwt from "jsonwebtoken";
import RevokedToken from "../models/revoked-token.model.js";
import User from "../models/user.model.js";
import { env } from "../config/env.js";
import AppError from "../utils/app-error.js";
import { hashToken } from "../utils/token.js";
import { readAuthCookie } from "../utils/auth-cookie.js";

export async function authenticate(req, _res, next) {
    const authorization = req.get("authorization");
    const [scheme, token] = authorization?.split(" ") ?? [];
    const sessionToken = readAuthCookie(req) ?? (scheme === "Bearer" ? token : null);

    if (!sessionToken) {
        return next(new AppError("Authentication is required.", 401));
    }

    let payload;
    try {
        payload = jwt.verify(sessionToken, env.JWT_SECRET);
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            return next(new AppError("Authentication token has expired.", 401));
        }

        if (error instanceof jwt.JsonWebTokenError) {
            return next(new AppError("Authentication token is invalid.", 401));
        }

        return next(error);
    }

    if (typeof payload === "string" || !payload.sub) {
        return next(new AppError("Authentication token is invalid.", 401));
    }

    const revokedToken = await RevokedToken.exists({ tokenHash: hashToken(sessionToken) });
    if (revokedToken) {
        return next(new AppError("Authentication token has been revoked.", 401));
    }

    const user = await User.findById(payload.sub).select("+tokenVersion");
    if (!user) {
        return next(new AppError("Authentication is required.", 401));
    }

    if ((payload.ver ?? 0) !== user.tokenVersion) {
        return next(new AppError("Authentication token has been revoked.", 401));
    }

    if (user.status !== "active") {
        return next(new AppError("This account is not active.", 403));
    }

    req.user = user;
    req.authToken = sessionToken;
    req.authPayload = payload;
    return next();
}