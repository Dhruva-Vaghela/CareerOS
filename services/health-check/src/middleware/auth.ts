import { Response, NextFunction, RequestHandler } from 'express';
import { Request } from 'express';
import { UnauthorizedError } from '@careeros/errors';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
  };
}

// Parses user information from request headers
export function parseAuth(): RequestHandler {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    const userIdHeader = req.headers['x-user-id'];

    if (userIdHeader && typeof userIdHeader === 'string') {
      req.user = { id: userIdHeader };
    } else {
      const authHeader = req.headers['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        // Placeholder check: for demo, treat token as userId
        req.user = { id: token };
      }
    }
    next();
  };
}

// Guards a route, requiring authenticated session
export function requireAuth(): RequestHandler {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Missing or invalid authentication credentials'));
      return;
    }
    next();
  };
}
