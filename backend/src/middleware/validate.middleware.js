import { validationResult } from "express-validator";
import AppError from "../utils/app-error.js";

export function validateRequest(req, _res, next) {
  const result = validationResult(req);

  if (!result.isEmpty()) {
    const details = result.array().map(({ path, msg }) => ({ field: path, message: msg }));
    return next(new AppError("Request validation failed.", 422, details));
  }

  return next();
}