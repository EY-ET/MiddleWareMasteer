import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
export declare function validateRequest(schema: {
    body?: Joi.ObjectSchema;
    query?: Joi.ObjectSchema;
    params?: Joi.ObjectSchema;
}): (req: Request, res: Response, next: NextFunction) => void;
export declare const commonSchemas: {
    jobId: Joi.ObjectSchema<any>;
    pagination: Joi.ObjectSchema<any>;
    tiktokAccountId: Joi.StringSchema<string>;
};
export declare function validateContentType(allowedTypes: string[]): (req: Request, res: Response, next: NextFunction) => void;
export declare function validateRequestSize(maxSizeBytes: number): (req: Request, res: Response, next: NextFunction) => void;
