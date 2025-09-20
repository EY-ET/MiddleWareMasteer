import cors from 'cors';
import { Request, Response, NextFunction } from 'express';
export declare const rateLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const uploadRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const corsOptions: (req: cors.CorsRequest, res: {
    statusCode?: number | undefined;
    setHeader(key: string, value: string): any;
    end(): any;
}, next: (err?: any) => any) => void;
export declare const securityHeaders: (req: import("http").IncomingMessage, res: import("http").ServerResponse, next: (err?: unknown) => void) => void;
export declare function requestLogger(req: Request, res: Response, next: NextFunction): void;
export declare const compressionMiddleware: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
export declare function securityValidation(req: Request, res: Response, next: NextFunction): void;
