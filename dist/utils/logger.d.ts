import winston from 'winston';
declare const logger: winston.Logger;
export declare const safeLogger: {
    error: (message: string, meta?: any) => winston.Logger;
    warn: (message: string, meta?: any) => winston.Logger;
    info: (message: string, meta?: any) => winston.Logger;
    debug: (message: string, meta?: any) => winston.Logger;
};
export { logger };
