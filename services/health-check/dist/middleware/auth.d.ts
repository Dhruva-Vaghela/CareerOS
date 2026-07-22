import { RequestHandler } from 'express';
import { Request } from 'express';
export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email?: string;
    };
}
export declare function parseAuth(): RequestHandler;
export declare function requireAuth(): RequestHandler;
//# sourceMappingURL=auth.d.ts.map