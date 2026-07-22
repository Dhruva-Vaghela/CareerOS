import { ZodError } from 'zod';
import { ValidationError } from '@careeros/errors';
export function validateRequest(schemas) {
    return async (req, _res, next) => {
        try {
            if (schemas.params) {
                req.params = await schemas.params.parseAsync(req.params);
            }
            if (schemas.query) {
                req.query = await schemas.query.parseAsync(req.query);
            }
            if (schemas.body) {
                req.body = await schemas.body.parseAsync(req.body);
            }
            next();
        }
        catch (error) {
            if (error instanceof ZodError) {
                const details = error.issues.map((issue) => ({
                    field: issue.path.join('.'),
                    message: issue.message,
                }));
                next(new ValidationError('Request validation failed', details));
            }
            else {
                next(error);
            }
        }
    };
}
//# sourceMappingURL=index.js.map