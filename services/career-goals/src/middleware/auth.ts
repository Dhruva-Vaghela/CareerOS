import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '@careeros/errors';
import { config } from '../config.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
  };
}

export function parseAuth(): RequestHandler {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, config.JWT_SECRET) as { userId?: string; sub?: string };
        const id = decoded.userId || decoded.sub;
        if (id) {
          req.user = { id };
        }
      } catch (_err) {
        // Invalid token or wrong secret: do not authenticate via jwt.decode().
      }
    }
    next();
  };
}

export function requireAuth(): RequestHandler {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user || !req.user.id) {
      next(new UnauthorizedError('Missing or invalid authentication credentials'));
      return;
    }
    next();
  };
}
