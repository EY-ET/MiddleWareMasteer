import { Request, Response, NextFunction } from 'express';
export declare const handleMultipleImages: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
export declare const handleSingleImage: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
export declare function validateUploadedFiles(req: Request, res: Response, next: NextFunction): void;
export declare function cleanupOldFiles(maxAgeMs?: number): void;
export declare function handleUploadErrors(error: any, req: Request, res: Response, next: NextFunction): void;
