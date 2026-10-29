import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from './AuthService.js';
import { UserModel, SessionModel } from '../db/schema.js';
import { eventBus } from '../bus.js';

describe('AuthService Unit Tests', () => {
  let authService: AuthService;

  beforeEach(() => {
    vi.restoreAllMocks();
    authService = new AuthService();
  });

  it('register() creates user, publishes event, generates tokens, and creates a session', async () => {
    const fakeUserId = '507f1f77bcf86cd799439011';
    const email = 'newuser@example.com';
    const password = 'Password123!';

    vi.spyOn(UserModel, 'findOne').mockResolvedValue(null as any);
    vi.spyOn(UserModel, 'create').mockResolvedValue({
      _id: { toHexString: () => fakeUserId },
      email: email.toLowerCase(),
      passwordHash: 'hashed_password',
      authProvider: 'LOCAL',
    } as any);

    const publishSpy = vi.spyOn(eventBus, 'publish').mockResolvedValue(undefined as any);
    const sessionCreateSpy = vi.spyOn(SessionModel, 'create').mockResolvedValue({} as any);

    const result = await authService.register(email, password);

    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
    expect(result.user).toEqual({
      id: fakeUserId,
      email: email.toLowerCase(),
    });
    expect(typeof result.accessToken).toBe('string');
    expect(typeof result.refreshToken).toBe('string');

    // Verify session persistence
    expect(sessionCreateSpy).toHaveBeenCalledTimes(1);
    expect(sessionCreateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: fakeUserId,
        refreshTokenHash: expect.any(String),
        expiresAt: expect.any(Date),
      }),
    );

    // Verify event bus published
    expect(publishSpy).toHaveBeenCalledTimes(1);
    expect(publishSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'user.registered',
        payload: {
          userId: fakeUserId,
          email: email.toLowerCase(),
        },
      }),
    );
  });

  it('loginWithGoogle() creates new user when account does not exist', async () => {
    const fakeUserId = '507f1f77bcf86cd799439022';
    const googleProfile = {
      sub: 'google-sub-123456',
      email: 'googleuser@example.com',
      name: 'Google User',
      picture: 'https://example.com/avatar.png',
      email_verified: true,
    };

    vi.spyOn(UserModel, 'findOne').mockResolvedValue(null as any);
    vi.spyOn(UserModel, 'create').mockResolvedValue({
      _id: { toHexString: () => fakeUserId },
      email: googleProfile.email.toLowerCase(),
      googleId: googleProfile.sub,
      authProvider: 'GOOGLE',
      status: 'ACTIVE',
    } as any);

    const publishSpy = vi.spyOn(eventBus, 'publish').mockResolvedValue(undefined as any);
    const sessionCreateSpy = vi.spyOn(SessionModel, 'create').mockResolvedValue({} as any);

    const result = await authService.loginWithGoogle(googleProfile);

    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
    expect(result.user).toEqual({
      id: fakeUserId,
      email: googleProfile.email.toLowerCase(),
    });
    expect(result.isNewUser).toBe(true);
    expect(result.name).toBe(googleProfile.name);

    // Verify session persistence
    expect(sessionCreateSpy).toHaveBeenCalledTimes(1);

    // Verify both user.registered and user.login events were published
    expect(publishSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'user.registered',
        payload: {
          userId: fakeUserId,
          email: googleProfile.email.toLowerCase(),
        },
      }),
    );
    expect(publishSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'user.login',
        payload: {
          userId: fakeUserId,
          timestamp: expect.any(String),
        },
      }),
    );
  });

  it('loginWithGoogle() links googleId and logs in when existing user matches email', async () => {
    const fakeUserId = '507f1f77bcf86cd799439033';
    const googleProfile = {
      sub: 'google-sub-789012',
      email: 'existing@example.com',
      name: 'Existing User',
      email_verified: true,
    };

    const existingUserDoc = {
      _id: { toHexString: () => fakeUserId },
      email: googleProfile.email.toLowerCase(),
      googleId: null as string | null,
      authProvider: 'LOCAL',
      status: 'ACTIVE',
      save: vi.fn().mockResolvedValue(true),
    };

    vi.spyOn(UserModel, 'findOne').mockResolvedValue(existingUserDoc as any);
    const createSpy = vi.spyOn(UserModel, 'create');
    const publishSpy = vi.spyOn(eventBus, 'publish').mockResolvedValue(undefined as any);
    vi.spyOn(SessionModel, 'create').mockResolvedValue({} as any);

    const result = await authService.loginWithGoogle(googleProfile);

    // Should NOT create new user record
    expect(createSpy).not.toHaveBeenCalled();
    // Should link googleId
    expect(existingUserDoc.googleId).toBe(googleProfile.sub);
    expect(existingUserDoc.save).toHaveBeenCalled();

    expect(result.isNewUser).toBe(false);
    expect(result.user.id).toBe(fakeUserId);

    // Should emit login event
    expect(publishSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'user.login',
      }),
    );
  });
});
