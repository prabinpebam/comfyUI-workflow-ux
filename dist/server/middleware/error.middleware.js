"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.ApiError = void 0;
class ApiError extends Error {
    constructor(statusCode, message, details) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
        this.name = 'ApiError';
    }
}
exports.ApiError = ApiError;
const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            message: err.message,
            details: err.details,
            ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
        });
    }
    if (err.name === 'MulterError') {
        return res.status(400).json({
            message: 'File upload error',
            details: err.message
        });
    }
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            message: 'Validation error',
            details: err.message
        });
    }
    return res.status(500).json({
        message: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' ? {
            details: err.message,
            stack: err.stack
        } : {})
    });
};
exports.errorHandler = errorHandler;
