import { Request, Response, NextFunction, RequestHandler } from 'express';
import { UnauthorizedError } from '@careeros/errors';
import jwt from 'jsonwebtoken';
import { createLogger } from '@careeros/logger';
import { config } from '../config.js';

const logger = createLogger('profile-auth-middleware');

interface TokenPayload {
  userId: string;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
  };
}

// Intentionally duplicated from auth service to avoid cross-service imports
// per CLAUDE.md §3 (loose coupling) and §5 (no direct imports across service boundaries).
// Uses the same JWT_SECRET so tokens issued by auth are valid here.

export function parseAuth(): RequestHandler {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, config.JWT_SECRET) as TokenPayload;
        if (decoded) {
          req.user = { id: decoded.userId };
        }
      } catch (error) {
        logger.warn({ err: error }, 'Invalid or expired access token');
      }
    }
    next();
  };
}

export function requireAuth(): RequestHandler {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Missing or invalid authentication credentials'));
      return;
    }
    next();
  };
}
