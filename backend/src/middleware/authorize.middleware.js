import AppError from "../utils/app-error.js";

export function authorizeRoles(...allowedRoles) {
  return function authorize(req, _res, next) {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(new AppError("You do not have permission to access this resource.", 403));
    }

    return next();
  };
}

export function restrictTo(...allowedRoles) {
  return function restrict(req, _res, next) {
    const userRole = (req.user?.role || "").toLowerCase();
    const normalizedAllowed = allowedRoles.map((r) => r.toLowerCase());
    if (!req.user || !normalizedAllowed.includes(userRole)) {
      if (normalizedAllowed.includes("admin") && normalizedAllowed.length === 1) {
        return next(new AppError("Chỉ Quản trị viên (Admin) mới có quyền tạo và cấp phát mã QR cho tủ khóa.", 403));
      }
      return next(new AppError("You do not have permission to access this resource.", 403));
    }

    return next();
  };
}