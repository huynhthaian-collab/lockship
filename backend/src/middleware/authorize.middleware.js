import AppError from "../utils/app-error.js";

export function authorizeRoles(...allowedRoles) {
  return function authorize(req, _res, next) {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(new AppError("You do not have permission to access this resource.", 403));
    }

    return next();
  };
}