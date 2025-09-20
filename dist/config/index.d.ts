export declare const config: {
    env: any;
    port: any;
    host: any;
    tiktok: {
        clientId: any;
        clientSecret: any;
        redirectUri: any;
        appId: any;
        apiBaseUrl: any;
    };
    security: {
        jwtSecret: any;
        adminApiKey: any;
        encryptionKey: any;
    };
    rateLimit: {
        windowMs: any;
        maxRequests: any;
    };
    upload: {
        maxFileSizeMB: any;
        maxFilesPerRequest: any;
        allowedMimeTypes: any;
    };
    cors: {
        origins: any;
    };
    logging: {
        level: any;
        filePath: any;
    };
    jobs: {
        timeoutMs: any;
        cleanupAfterHours: any;
    };
    trustProxy: any;
};
