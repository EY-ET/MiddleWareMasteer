import { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                role: string;
            };
            isAdmin?: boolean;
        }
    }
}
export declare function adminAuth(req: Request, res: Response, next: NextFunction): void;
export declare function optionalJwtAuth(req: Request, res: Response, next: NextFunction): void;
export declare function requireJwtAuth(req: Request, res: Response, next: NextFunction): void;
