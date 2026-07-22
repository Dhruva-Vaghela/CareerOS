import { RequestHandler } from 'express';
import { AnyZodObject } from 'zod';
export interface RequestValidationSchemas {
    body?: AnyZodObject;
    query?: AnyZodObject;
    params?: AnyZodObject;
}
export declare function validateRequest(schemas: RequestValidationSchemas): RequestHandler;
//# sourceMappingURL=index.d.ts.map