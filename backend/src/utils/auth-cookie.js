export const AUTH_COOKIE_NAME = "lockship_session";
export const AUTH_COOKIE_MAX_AGE = 15 * 60 * 1000;

export function authCookieOptions() {
    const secure = process.env.NODE_ENV === "production";
    return {
        httpOnly: true,
        secure,
        sameSite: secure ? "none" : "lax",
        maxAge: AUTH_COOKIE_MAX_AGE,
        path: "/",
    };
}

export function readAuthCookie(req) {
    const cookieHeader = req.get?.("cookie") ?? req.headers?.cookie ?? "";
    const cookie = cookieHeader
        .split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith(`${AUTH_COOKIE_NAME}=`));

    if (!cookie) {
        return null;
    }

    const value = cookie.slice(AUTH_COOKIE_NAME.length + 1);
    try {
        return decodeURIComponent(value) || null;
    } catch {
        return null;
    }
}

export function clearAuthCookie(res) {
    const secure = process.env.NODE_ENV === "production";
    res.clearCookie(AUTH_COOKIE_NAME, {
        httpOnly: true,
        secure,
        sameSite: secure ? "none" : "lax",
        path: "/",
    });
}
