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
        const decoded = jwt.verify(token, config.JWT_SECRET) as { userId?: string };
        if (decoded?.userId) {
          req.user = { id: decoded.userId };
        }
      } catch {
        req.user = undefined;
      }
    }
    next();
  };
}

export function requireAuth(): RequestHandler {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user?.id) {
      next(new UnauthorizedError('Missing or invalid authentication credentials'));
      return;
    }
    next();
  };
}
