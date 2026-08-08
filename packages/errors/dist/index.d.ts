import { Request, Response, NextFunction } from 'express';
export declare class AppError extends Error {
    readonly statusCode: number;
    readonly code: string;
    readonly details?: unknown;
    constructor(message: string, statusCode: number, code: string, details?: unknown);
}
export declare class BadRequestError extends AppError {
    constructor(message?: string, details?: unknown);
}
export declare class ValidationError extends AppError {
    constructor(message: string, details?: unknown);
}
export declare class UnauthorizedError extends AppError {
    constructor(message?: string);
}
export declare class ForbiddenError extends AppError {
    constructor(message?: string);
}
export declare class NotFoundError extends AppError {
    constructor(message?: string);
}
export declare class ConflictError extends AppError {
    constructor(message: string, code?: string);
}
export declare class DatabaseError extends AppError {
    constructor(message?: string, details?: unknown);
}
export declare class AIError extends AppError {
    constructor(message: string, code: string, details?: unknown);
}
export declare class ConfigurationError extends AIError {
    constructor(message: string, details?: unknown);
}
export declare class ProviderError extends AIError {
    constructor(message: string, details?: unknown);
}
export declare class AuthenticationError extends AIError {
    constructor(message?: string);
}
export declare class TimeoutError extends AIError {
    constructor(message?: string);
}
export declare class UnsupportedProviderError extends AIError {
    constructor(provider: string);
}
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: unknown;
    };
}
export declare function formatSuccess<T>(data: T): ApiResponse<T>;
export declare function formatError(code: string, message: string, details?: unknown): ApiResponse;
export declare function globalErrorHandler(err: Error, req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=index.d.ts.map