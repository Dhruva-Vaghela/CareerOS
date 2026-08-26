import { UserModel, SessionModel } from '../db/schema.js';
import { PasswordService } from './PasswordService.js';
import { JwtService } from './JwtService.js';
import { UnauthorizedError, ConflictError, NotFoundError, BadRequestError } from '@careeros/errors';
import { eventBus } from '../bus.js';
import crypto from 'crypto';

export class AuthService {
  private passwordService = new PasswordService();
  private jwtService = new JwtService();

  async register(email: string, passwordRaw: string) {
    const existing = await UserModel.findOne({ email: email.toLowerCase() });
    if (existing) {
      throw new ConflictError('User already exists', 'USER_ALREADY_EXISTS');
    }

    const passwordHash = await this.passwordService.hashPassword(passwordRaw);

    const newUser = await UserModel.create({
      email: email.toLowerCase(),
      passwordHash,
      authProvider: 'LOCAL',
    });

    const userIdStr = newUser._id.toHexString();

    await eventBus.publish({
      name: 'user.registered',
      metadata: {
        eventId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        traceId: 'internal-registration',
        userId: userIdStr,
      },
      payload: {
        userId: userIdStr,
        email: newUser.email,
      },
    });

    return {
      id: userIdStr,
      email: newUser.email,
    };
  }

  async login(email: string, passwordRaw: string) {
    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const isValid = await this.passwordService.verifyPassword(passwordRaw, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const userIdStr = user._id.toHexString();
    const accessToken = this.jwtService.generateAccessToken(userIdStr);
    const { token: refreshToken, hash: refreshTokenHash } = this.jwtService.generateRefreshToken();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await SessionModel.create({
      userId: userIdStr,
      refreshTokenHash,
      expiresAt,
    });

    await eventBus.publish({
      name: 'user.login',
      metadata: {
        eventId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        traceId: 'internal-login',
        userId: userIdStr,
      },
      payload: {
        userId: userIdStr,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: userIdStr,
        email: user.email,
      },
    };
  }

  async refresh(refreshToken: string) {
    const hash = this.jwtService.hashRefreshToken(refreshToken);

    const session = await SessionModel.findOne({
      refreshTokenHash: hash,
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const accessToken = this.jwtService.generateAccessToken(session.userId);

    const { token: newRefreshToken, hash: newRefreshTokenHash } = this.jwtService.generateRefreshToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Delete old session and create new rotated session
    await SessionModel.deleteOne({ _id: session._id });
    await SessionModel.create({
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
    const hash = this.jwtService.hashRefreshToken(refreshToken);
    await SessionModel.deleteOne({ refreshTokenHash: hash });
  }

  async forgotPassword(email: string) {
    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new NotFoundError('No user found with this email address');
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    await user.save();

    return {
      message: 'Password reset link generated successfully.',
      resetToken,
    };
  }

  async verifyResetToken(token: string) {
    const user = await UserModel.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() },
    });

    if (!user) {
      throw new BadRequestError('Invalid or expired password reset token');
    }

    return { valid: true, email: user.email };
  }

  async resetPassword(token: string, newPasswordRaw: string) {
    const user = await UserModel.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() },
    });

    if (!user) {
      throw new BadRequestError('Invalid or expired password reset token');
    }

    const passwordHash = await this.passwordService.hashPassword(newPasswordRaw);

    user.passwordHash = passwordHash;
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    // Invalidate existing sessions after password reset
    await SessionModel.deleteMany({ userId: user._id.toHexString() });

    return {
      message: 'Password has been reset successfully. Please sign in with your new password.',
    };
  }
}
