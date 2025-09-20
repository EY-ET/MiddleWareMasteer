import Joi from 'joi';
export declare const createCarouselSchema: Joi.ObjectSchema<any>;
export declare const webhookUploadSchema: Joi.ObjectSchema<any>;
export declare function validateImageFile(file: Express.Multer.File): {
    valid: boolean;
    error?: string;
};
export declare function validateImageUrl(url: string): {
    valid: boolean;
    error?: string;
};
export declare function validateBase64Image(base64: string): {
    valid: boolean;
    error?: string;
    mimeType?: string;
};
