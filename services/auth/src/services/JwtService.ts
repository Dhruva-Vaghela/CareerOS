import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { createLogger } from '@careeros/logger';
import { config } from '../config.js';

const logger = createLogger('jwt-service');

export interface TokenPayload {
  userId: string;
}

export class JwtService {
  generateAccessToken(userId: string): string {
    return jwt.sign({ userId }, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN,
    });
  }

  verifyAccessToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET) as TokenPayload;
      return decoded;
    } catch (error) {
      logger.warn({ err: error }, 'Invalid or expired access token');
      return null;
    }
  }

  generateRefreshTokenHash(): string {
    // Generate a random 64 byte hex string as refresh token
    const token = crypto.randomBytes(64).toString('hex');
    // We hash it to store in DB so that even if DB is compromised, refresh tokens aren't immediately usable
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    return { token, hash };
  }

  generateRefreshToken(): { token: string; hash: string } {
    const token = crypto.randomBytes(64).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    return { token, hash };
  }

  hashRefreshToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
