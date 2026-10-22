import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { env } from "../config/env.js";
import { isOriginAllowed } from "../config/cors.js";
import RevokedToken from "../models/revoked-token.model.js";
import User from "../models/user.model.js";
import { hashToken } from "../utils/token.js";
import { readAuthCookie } from "../utils/auth-cookie.js";

let socketServer = null;

function userRoom(userId) {
    return `user:${userId}`;
}

function tokenRoom(tokenHash) {
    return `token:${tokenHash}`;
}

function sanitizeSocketPayload(value, depth = 0) {
    if (depth > 6) {
        return "[depth limited]";
    }
    if (Array.isArray(value)) {
        return value.slice(0, 100).map((item) => sanitizeSocketPayload(item, depth + 1));
    }
    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value)
                .filter(([key]) => key === "errorCode" || !/(token|secret|password|code|credential|authorization)/i.test(key))
                .slice(0, 100)
                .map(([key, item]) => [key, sanitizeSocketPayload(item, depth + 1)]),
        );
    }
    if (typeof value === "string") {
        return value.slice(0, 2000);
    }
    if (typeof value === "number" || typeof value === "boolean" || value === null) {
        return value;
    }
    return String(value).slice(0, 2000);
}

function readSocketToken(socket) {
    const handshakeToken = socket.handshake.auth?.token;
    if (typeof handshakeToken === "string" && handshakeToken.length > 0) {
        return handshakeToken;
    }
    const cookieToken = readAuthCookie(socket.request);
    if (cookieToken) {
        return cookieToken;
    }

    const authorization = socket.handshake.headers.authorization;
    const [scheme, token] = typeof authorization === "string" ? authorization.split(" ") : [];
    return scheme === "Bearer" ? token : null;
}

export function initializeSocket(httpServer) {
    if (socketServer) {
        throw new Error("Socket.IO has already been initialized.");
    }

    socketServer = new Server(httpServer, {
        cors: {
            origin: function (origin, callback) {
                if (isOriginAllowed(origin)) {
                    callback(null, true);
                } else {
                    callback(new Error("Not allowed by CORS"));
                }
            },
            credentials: true,
            methods: ["GET", "POST"],
        },
        maxHttpBufferSize: 16 * 1024,
    });

    socketServer.use(async (socket, next) => {
        const token = readSocketToken(socket);
        if (!token) {
            next(new Error("Authentication required."));
            return;
        }

        let claims;
        try {
            claims = jwt.verify(token, env.JWT_SECRET);
        } catch {
            next(new Error("Authentication token is invalid or expired."));
            return;
        }
        if (typeof claims === "string" || !claims.sub || typeof claims.exp !== "number") {
            next(new Error("Authentication token is invalid."));
            return;
        }

        // Support guest token for public locker access request
        if (claims.purpose === "guest-box-access" && claims.requestId) {
            socket.data.isGuest = true;
            socket.data.requestId = String(claims.requestId);
            socket.data.boxId = claims.boxId;
            socket.data.tokenHash = hashToken(token);
            socket.data.tokenExpiresAt = claims.exp * 1000;
            next();
            return;
        }

        try {
            if (await RevokedToken.exists({ tokenHash: hashToken(token) })) {
                next(new Error("Authentication token has been revoked."));
                return;
            }

            const user = await User.findById(claims.sub).select("+tokenVersion");
            if (!user || user.status !== "active" || (claims.ver ?? 0) !== user.tokenVersion) {
                next(new Error("Authentication is no longer valid."));
                return;
            }

            socket.data.userId = user.id;
            socket.data.role = user.role;
            socket.data.tokenHash = hashToken(token);
            socket.data.tokenExpiresAt = claims.exp * 1000;
            next();
        } catch {
            next(new Error("Unable to authenticate socket connection."));
        }
    });

    socketServer.on("connection", (socket) => {
        if (socket.data.isGuest) {
            socket.join(`request_${socket.data.requestId}`);
            socket.join(`request:${socket.data.requestId}`);

            let guestExpiryTimer;
            const disconnectGuest = () => {
                const remaining = socket.data.tokenExpiresAt - Date.now();
                if (remaining <= 0) {
                    socket.disconnect(true);
                    return;
                }
                guestExpiryTimer = setTimeout(disconnectGuest, Math.min(remaining, 2_147_000_000));
            };
            disconnectGuest();
            socket.once("disconnect", () => clearTimeout(guestExpiryTimer));
            return;
        }

        socket.join(userRoom(socket.data.userId));
        socket.join(tokenRoom(socket.data.tokenHash));
        if (socket.data.role) {
            socket.join(`role:${socket.data.role}`);
        }

        let expiryTimer;
        const disconnectAtExpiry = () => {
            const remaining = socket.data.tokenExpiresAt - Date.now();
            if (remaining <= 0) {
                socket.disconnect(true);
                return;
            }
            expiryTimer = setTimeout(disconnectAtExpiry, Math.min(remaining, 2_147_000_000));
        };
        disconnectAtExpiry();
        socket.once("disconnect", () => clearTimeout(expiryTimer));
    });

    return socketServer;
}

export function broadcastSocket(eventName, payload) {
    if (!socketServer) {
        return false;
    }
    socketServer.emit(eventName, sanitizeSocketPayload(payload));
    return true;
}

export function emitToRole(role, eventName, payload) {
    if (!socketServer || !role) {
        return false;
    }
    socketServer.to(`role:${role}`).emit(eventName, sanitizeSocketPayload(payload));
    return true;
}

export function emitToUser(userId, eventName, payload) {
    if (!socketServer || !userId) {
        return false;
    }

    socketServer.to(userRoom(userId.toString())).emit(eventName, sanitizeSocketPayload(payload));
    return true;
}

export function emitToUsers(userIds, eventName, payload) {
    const distinctUserIds = [...new Set(userIds.filter(Boolean).map((id) => id.toString()))];
    for (const userId of distinctUserIds) {
        emitToUser(userId, eventName, payload);
    }
}

export function disconnectUserToken(token) {
    if (socketServer && token) {
        socketServer.in(tokenRoom(hashToken(token))).disconnectSockets(true);
    }
}

export function disconnectUserSockets(userId) {
    if (socketServer && userId) {
        socketServer.in(userRoom(userId.toString())).disconnectSockets(true);
    }
}

export function emitToRequest(requestId, eventName, payload) {
    if (!socketServer || !requestId) {
        return false;
    }
    socketServer.to(`request_${requestId}`).to(`request:${requestId}`).emit(eventName, payload);
    return true;
}

export async function closeSocket() {
    if (!socketServer) {
        return;
    }

    const activeSocketServer = socketServer;
    socketServer = null;
    await new Promise((resolve) => activeSocketServer.close(resolve));
}