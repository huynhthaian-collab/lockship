import mongoose from "mongoose";
import { env } from "../config/env.js";

export function errorHandler(error, _req, res, next) {
    if (res.headersSent) {
        return next(error);
    }

    let statusCode = error.statusCode ?? 500;
    let message = error.message ?? "Internal server error.";
    let data = error.details ? { errors: error.details } : {};
    if (error.errorCode) {
        data.errorCode = error.errorCode;
    }

    if (error.code === 11000) {
        statusCode = 409;
        message = "A record with this value already exists.";
        data = {};
    } else if (error instanceof mongoose.Error.ValidationError) {
        statusCode = 422;
        message = "Database validation failed.";
        data = {
            errors: Object.values(error.errors).map(({ path, message: fieldMessage }) => ({
                field: path,
                message: fieldMessage,
            })),
        };
    } else if (error instanceof mongoose.Error.CastError) {
        statusCode = 400;
        message = "The supplied identifier is invalid.";
        data = {};
    }

    if (statusCode >= 500) {
        console.error(error);
        if (env.NODE_ENV === "production") {
            message = "Internal server error.";
            data = error.errorCode ? { errorCode: error.errorCode } : {};
        }
    }

    return res.status(statusCode).json({
        success: false,
        message,
        data,
    });
}