import { getDb } from '../db/index.js';
import { users, sessions } from '../db/schema.js';
import { PasswordService } from './PasswordService.js';
import { JwtService } from './JwtService.js';
import { UnauthorizedError, ConflictError } from '@careeros/errors';
import { eventBus } from '../bus.js';
import { eq, and, gt } from 'drizzle-orm';
import crypto from 'crypto';

export class AuthService {
  private passwordService = new PasswordService();
  private jwtService = new JwtService();

  async register(email: string, passwordRaw: string) {
    const { db } = getDb();

    // Check if user exists
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      throw new ConflictError('User already exists', 'USER_ALREADY_EXISTS');
    }

    const passwordHash = await this.passwordService.hashPassword(passwordRaw);

    // Insert user
    const [newUser] = await db.insert(users).values({
      email,
      passwordHash,
      authProvider: 'LOCAL',
    }).returning();

    // Publish event
    await eventBus.publish({
      name: 'user.registered',
      metadata: {
        eventId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        traceId: 'internal-registration',
        userId: newUser.id,
      },
      payload: {
        userId: newUser.id,
        email: newUser.email,
      },
    });

    return {
      id: newUser.id,
      email: newUser.email,
    };
  }

  async login(email: string, passwordRaw: string) {
    const { db } = getDb();

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const isValid = await this.passwordService.verifyPassword(passwordRaw, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const accessToken = this.jwtService.generateAccessToken(user.id);
    const { token: refreshToken, hash: refreshTokenHash } = this.jwtService.generateRefreshToken();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await db.insert(sessions).values({
      userId: user.id,
      refreshTokenHash,
      expiresAt,
    });

    await eventBus.publish({
      name: 'user.login',
      metadata: {
        eventId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        traceId: 'internal-login',
        userId: user.id,
      },
      payload: {
        userId: user.id,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }

  async refresh(refreshToken: string) {
    const { db } = getDb();
    
    const hash = this.jwtService.hashRefreshToken(refreshToken);
    
    const [session] = await db.select()
      .from(sessions)
      .where(and(
        eq(sessions.refreshTokenHash, hash),
        gt(sessions.expiresAt, new Date())
      )).limit(1);

    if (!session) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // Generate new access token
    const accessToken = this.jwtService.generateAccessToken(session.userId);

    // Rotate refresh token
    const { token: newRefreshToken, hash: newRefreshTokenHash } = this.jwtService.generateRefreshToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Delete old session and create new one (rotation)
    await db.delete(sessions).where(eq(sessions.id, session.id));
    await db.insert(sessions).values({
      userId: session.userId,
      refreshTokenHash: newRefreshTokenHash,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(refreshToken: string) {
    const { db } = getDb();
    const hash = this.jwtService.hashRefreshToken(refreshToken);
    await db.delete(sessions).where(eq(sessions.refreshTokenHash, hash));
  }
}
