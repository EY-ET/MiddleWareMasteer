import { Request, Response, NextFunction } from 'express';
export interface AppError extends Error {
    statusCode?: number;
    code?: string;
    details?: any;
}
export declare class CustomError extends Error implements AppError {
    statusCode: number;
    code: string;
    details?: any;
    constructor(message: string, statusCode?: number, code?: string, details?: any);
}
export declare function notFoundHandler(req: Request, res: Response, next: NextFunction): void;
export declare function errorHandler(error: AppError, req: Request, res: Response, next: NextFunction): void;
export declare function asyncHandler(fn: Function): (req: Request, res: Response, next: NextFunction) => void;
export declare const createError: {
    badRequest: (message?: string, details?: any) => CustomError;
    unauthorized: (message?: string, details?: any) => CustomError;
    forbidden: (message?: string, details?: any) => CustomError;
    notFound: (message?: string, details?: any) => CustomError;
    conflict: (message?: string, details?: any) => CustomError;
    tooLarge: (message?: string, details?: any) => CustomError;
    tooManyRequests: (message?: string, details?: any) => CustomError;
    internal: (message?: string, details?: any) => CustomError;
    serviceUnavailable: (message?: string, details?: any) => CustomError;
    tiktokError: (message: string, details?: any) => CustomError;
};
