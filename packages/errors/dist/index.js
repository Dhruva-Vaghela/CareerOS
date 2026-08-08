import { createLogger } from '@careeros/logger';
const logger = createLogger('error-handler');
// Base Application Error class
export class AppError extends Error {
    statusCode;
    code;
    details;
    constructor(message, statusCode, code, details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}
// Concrete Error Classes
export class BadRequestError extends AppError {
    constructor(message = 'Bad request', details) {
        super(message, 400, 'BAD_REQUEST', details);
    }
}
export class ValidationError extends AppError {
    constructor(message, details) {
        super(message, 400, 'VALIDATION_ERROR', details);
    }
}
export class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized access') {
        super(message, 401, 'UNAUTHORIZED');
    }
}
export class ForbiddenError extends AppError {
    constructor(message = 'Forbidden access') {
        super(message, 403, 'FORBIDDEN');
    }
}
export class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404, 'NOT_FOUND');
    }
}
export class ConflictError extends AppError {
    constructor(message, code = 'CONFLICT_ERROR') {
        super(message, 409, code);
    }
}
export class DatabaseError extends AppError {
    constructor(message = 'Database operation failed', details) {
        super(message, 500, 'DATABASE_ERROR', details);
    }
}
export class AIError extends AppError {
    constructor(message, code, details) {
        super(message, 502, code, details);
    }
}
export class ConfigurationError extends AIError {
    constructor(message, details) {
        super(message, 'AI_CONFIGURATION_ERROR', details);
    }
}
export class ProviderError extends AIError {
    constructor(message, details) {
        super(message, 'AI_PROVIDER_ERROR', details);
    }
}
export class AuthenticationError extends AIError {
    constructor(message = 'AI provider authentication failed') {
        super(message, 'AI_AUTHENTICATION_ERROR');
    }
}
export class TimeoutError extends AIError {
    constructor(message = 'AI provider request timed out') {
        super(message, 'AI_TIMEOUT_ERROR');
    }
}
export class UnsupportedProviderError extends AIError {
    constructor(provider) {
        super(`AI provider "${provider}" is not supported.`, 'AI_UNSUPPORTED_PROVIDER');
    }
}
export function formatSuccess(data) {
    return {
        success: true,
        data,
    };
}
export function formatError(code, message, details) {
    return {
        success: false,
        error: {
            code,
            message,
            details,
        },
    };
}
// Express Global Error Handler Middleware
export function globalErrorHandler(err, req, res, 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
next) {
    const traceId = req.headers['x-trace-id'] || 'none';
    if (err instanceof AppError) {
        logger.warn({
            message: err.message,
            statusCode: err.statusCode,
            code: err.code,
            details: err.details,
            path: req.path,
            method: req.method,
            traceId,
        });
        res.status(err.statusCode).json(formatError(err.code, err.message, err.details));
        return;
    }
    // Unhandled internal errors
    logger.error({
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        traceId,
    });
    res.status(500).json(formatError('INTERNAL_SERVER_ERROR', process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred.'
        : err.message));
}
//# sourceMappingURL=index.js.map