import { Request, Response } from 'express';
export declare const healthCheck: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const detailedHealth: (req: Request, res: Response, next: import("express").NextFunction) => void;
