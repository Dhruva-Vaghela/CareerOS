import { Request, Response, NextFunction, RequestHandler } from 'express';
import { UnauthorizedError } from '@careeros/errors';
import { JwtService } from '../services/JwtService.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
  };
}

const jwtService = new JwtService();

// Parses user information from request headers
export function parseAuth(): RequestHandler {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwtService.verifyAccessToken(token);
      if (decoded) {
        req.user = { id: decoded.userId };
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
