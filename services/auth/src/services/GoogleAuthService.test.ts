import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OAuth2Client } from 'google-auth-library';
import { GoogleAuthService } from './GoogleAuthService.js';
import { config } from '../config.js';

describe('GoogleAuthService Unit Tests', () => {
  let googleAuthService: GoogleAuthService;

  beforeEach(() => {
    vi.restoreAllMocks();
    googleAuthService = new GoogleAuthService();
  });

  it('getAuthorizationUrl() builds correct Google OAuth URL', () => {
    config.GOOGLE_CLIENT_ID = 'test-google-client-id';
    const state = 'csrf-token-123';
    const url = googleAuthService.getAuthorizationUrl(state);

    expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url).toContain('client_id=test-google-client-id');
    expect(url).toContain('response_type=code');
    expect(url).toContain('state=csrf-token-123');
    expect(url).toContain('scope=openid+email+profile');
  });

  it('getAuthorizationUrl() throws error if GOOGLE_CLIENT_ID is not configured', () => {
    const originalClientId = config.GOOGLE_CLIENT_ID;
    config.GOOGLE_CLIENT_ID = '';

    try {
      expect(() => googleAuthService.getAuthorizationUrl()).toThrowError(
        'Google Authentication is not configured',
      );
    } finally {
      config.GOOGLE_CLIENT_ID = originalClientId;
    }
  });

  it('verifyIdToken() successfully validates trusted Google ID token', async () => {
    const fakePayload = {
      sub: 'google-sub-456',
      email: 'alex@example.com',
      email_verified: true,
      name: 'Alex Rivera',
      picture: 'https://lh3.google.com/photo.jpg',
      iss: 'https://accounts.google.com',
      aud: 'test-client-id',
    };

    vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
      getPayload: () => fakePayload,
    } as any);

    const profile = await googleAuthService.verifyIdToken('valid-id-token', 'test-client-id');

    expect(profile.sub).toBe('google-sub-456');
    expect(profile.email).toBe('alex@example.com');
    expect(profile.name).toBe('Alex Rivera');
    expect(profile.email_verified).toBe(true);
  });

  it('verifyIdToken() rejects token with unverified email (anti-account takeover)', async () => {
    const fakePayload = {
      sub: 'google-sub-789',
      email: 'unverified@example.com',
      email_verified: false,
      iss: 'https://accounts.google.com',
      aud: 'test-client-id',
    };

    vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
      getPayload: () => fakePayload,
    } as any);

    await expect(
      googleAuthService.verifyIdToken('unverified-id-token', 'test-client-id'),
    ).rejects.toThrowError('Google email address is not verified');
  });

  it('verifyIdToken() rejects token with audience mismatch', async () => {
    const fakePayload = {
      sub: 'google-sub-999',
      email: 'alex@example.com',
      email_verified: true,
      iss: 'https://accounts.google.com',
      aud: 'different-client-id',
    };

    vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
      getPayload: () => fakePayload,
    } as any);

    await expect(
      googleAuthService.verifyIdToken('mismatched-aud-token', 'test-client-id'),
    ).rejects.toThrowError('audience mismatch');
  });

  it('exchangeCodeAndGetProfile() exchanges code and verifies profile via ID token', async () => {
    config.GOOGLE_CLIENT_ID = 'test-client-id';
    config.GOOGLE_CLIENT_SECRET = 'test-client-secret';

    const fakeTokenResponse = {
      access_token: 'fake-google-access-token',
      id_token: 'fake-google-id-token',
      token_type: 'Bearer',
      expires_in: 3600,
    };

    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => fakeTokenResponse,
    });

    vi.stubGlobal('fetch', fetchMock);

    vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
      getPayload: () => ({
        sub: 'google-sub-456',
        email: 'alex@example.com',
        email_verified: true,
        name: 'Alex Rivera',
        picture: 'https://lh3.google.com/photo.jpg',
        iss: 'https://accounts.google.com',
        aud: 'test-client-id',
      }),
    } as any);

    const profile = await googleAuthService.exchangeCodeAndGetProfile('test-auth-code');

    expect(profile.sub).toBe('google-sub-456');
    expect(profile.email).toBe('alex@example.com');
    expect(profile.name).toBe('Alex Rivera');
    expect(profile.picture).toBe('https://lh3.google.com/photo.jpg');
    expect(profile.email_verified).toBe(true);

    vi.unstubAllGlobals();
  });
});
