import AppError from "../utils/app-error.js";

function containsProhibitedKeys(obj, depth = 0) {
    if (!obj || typeof obj !== "object" || depth > 10) {
        return false;
    }
    for (const key of Object.keys(obj)) {
        if (key.startsWith("$") || key.includes(".")) {
            return true;
        }
        if (typeof obj[key] === "object" && containsProhibitedKeys(obj[key], depth + 1)) {
            return true;
        }
    }
    return false;
}

export function sanitizeInputs(req, _res, next) {
    if (
        containsProhibitedKeys(req.body) ||
        containsProhibitedKeys(req.query) ||
        containsProhibitedKeys(req.params)
    ) {
        return next(new AppError("Prohibited operators detected in request data.", 400));
    }
    return next();
}

