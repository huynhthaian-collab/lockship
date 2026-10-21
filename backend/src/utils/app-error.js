export default class AppError extends Error {
    constructor(message, statusCode = 500, details = null, errorCode = null) {
        super(message);
        this.name = "AppError";
        this.statusCode = statusCode;
        this.details = details;
        this.errorCode = errorCode;
        Error.captureStackTrace(this, this.constructor);
    }
}