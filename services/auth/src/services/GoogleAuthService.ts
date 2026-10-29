import { OAuth2Client } from 'google-auth-library';
import { config } from '../config.js';
import { createLogger } from '@careeros/logger';
import { BadRequestError, UnauthorizedError } from '@careeros/errors';

const logger = createLogger('google-auth-service');

export interface GoogleUserProfile {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  email_verified: boolean;
}

export class GoogleAuthService {
  /**
   * Generates the Google OAuth 2.0 authorization URL.
   */
  public getAuthorizationUrl(state?: string, redirectUri?: string): string {
    const clientId = config.GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new BadRequestError('Google Authentication is not configured (missing GOOGLE_CLIENT_ID)');
    }

    const callbackUrl = redirectUri || config.GOOGLE_CALLBACK_URL;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'select_account',
    });

    if (state) {
      params.append('state', state);
    }

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchanges an authorization code for Google tokens and verifies the user profile.
   */
  public async exchangeCodeAndGetProfile(code: string, redirectUri?: string): Promise<GoogleUserProfile> {
    const clientId = config.GOOGLE_CLIENT_ID;
    const clientSecret = config.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new BadRequestError('Google Authentication is not configured on the server');
    }

    const callbackUrl = redirectUri || config.GOOGLE_CALLBACK_URL;

    logger.info({ callbackUrl }, 'Exchanging authorization code with Google');

    const tokenParams = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: callbackUrl,
      grant_type: 'authorization_code',
    });

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      logger.error({ status: tokenResponse.status, errorData }, 'Google token exchange failed');
      throw new BadRequestError('Failed to exchange authorization code with Google');
    }

    const tokenData = (await tokenResponse.json()) as {
      access_token: string;
      id_token?: string;
      token_type: string;
      expires_in: number;
    };

    if (!tokenData.access_token) {
      throw new UnauthorizedError('No access token received from Google');
    }

    // Verify identity via tokeninfo or userinfo endpoint
    let profile: GoogleUserProfile;

    if (tokenData.id_token) {
      profile = await this.verifyIdToken(tokenData.id_token, clientId);
    } else {
      profile = await this.fetchUserInfo(tokenData.access_token);
    }

    if (!profile.email) {
      throw new UnauthorizedError('Google account did not provide an email address');
    }

    if (!profile.email_verified) {
      throw new UnauthorizedError('Google email address is not verified');
    }

    return profile;
  }

  /**
   * Cryptographically validates Google ID token using trusted google-auth-library.
   * Validates:
   * 1. Cryptographic RSA signature against Google's public JWKS certificates
   * 2. Issuer is 'accounts.google.com' or 'https://accounts.google.com'
   * 3. Audience matches GOOGLE_CLIENT_ID
   * 4. Expiration time (exp) is strictly in the future
   */
  public async verifyIdToken(idToken: string, expectedClientId: string): Promise<GoogleUserProfile> {
    try {
      const client = new OAuth2Client(expectedClientId);
      const ticket = await client.verifyIdToken({
        idToken,
        audience: expectedClientId,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new UnauthorizedError('Google ID token verification returned empty payload');
      }

      // 1. Verify Issuer
      const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
      if (!payload.iss || !validIssuers.includes(payload.iss)) {
        logger.error({ iss: payload.iss }, 'Invalid Google token issuer');
        throw new UnauthorizedError('Invalid Google ID token issuer');
      }

      // 2. Verify Audience
      if (payload.aud !== expectedClientId) {
        logger.error({ aud: payload.aud, expected: expectedClientId }, 'Google ID token audience mismatch');
        throw new UnauthorizedError('Google ID token audience mismatch');
      }

      // 3. Verify Email and Verified Flag (Prevents account takeover)
      if (!payload.email) {
        throw new UnauthorizedError('Google ID token missing email');
      }

      const isVerified = payload.email_verified === true;
      if (!isVerified) {
        throw new UnauthorizedError('Google email address is not verified');
      }

      return {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        email_verified: isVerified,
      };
    } catch (err: any) {
      if (err instanceof UnauthorizedError) {
        throw err;
      }
      logger.error({ err: err.message }, 'Google ID token cryptographic verification failed');
      throw new UnauthorizedError(`Invalid Google ID token: ${err.message}`);
    }
  }

  /**
   * Fetches user profile from Google's userinfo endpoint using access token.
   */
  private async fetchUserInfo(accessToken: string): Promise<GoogleUserProfile> {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      logger.error({ status: res.status }, 'Failed to fetch Google user info');
      throw new UnauthorizedError('Failed to fetch user profile from Google');
    }

    const info = (await res.json()) as {
      sub: string;
      email: string;
      email_verified?: boolean;
      name?: string;
      picture?: string;
    };

    return {
      sub: info.sub,
      email: info.email,
      name: info.name,
      picture: info.picture,
      email_verified: !!info.email_verified,
    };
  }
}
