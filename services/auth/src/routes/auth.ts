import { Router, Response, NextFunction } from 'express';
import { formatSuccess } from '@careeros/errors';
import { validateRequest } from '@careeros/validation';
import { AuthService } from '../services/AuthService.js';
import { GoogleAuthService } from '../services/GoogleAuthService.js';
import { oAuthTicketStore } from '../services/OAuthTicketStore.js';
import { config } from '../config.js';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  googleCallbackSchema,
  googleExchangeSchema,
} from '../validation/auth.schema.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { UnauthorizedError } from '@careeros/errors';
import crypto from 'crypto';

const router = Router();
const authService = new AuthService();
const googleAuthService = new GoogleAuthService();

router.post(
  '/register',
  validateRequest({ body: registerSchema }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const result = await authService.register(email, password);
      res.status(201).json(formatSuccess(result));
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/login',
  validateRequest({ body: loginSchema }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      res.json(formatSuccess(result));
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/refresh',
  validateRequest({ body: refreshSchema }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;
      const tokens = await authService.refresh(refreshToken);
      res.json(formatSuccess(tokens));
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/logout',
  validateRequest({ body: logoutSchema }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;
      await authService.logout(refreshToken);
      res.json(formatSuccess({ message: 'Logged out successfully' }));
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/forgot-password',
  validateRequest({ body: forgotPasswordSchema }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;
      const result = await authService.forgotPassword(email);
      res.json(formatSuccess(result));
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/validate-reset-token',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const token = String(req.query.token || '');
      const result = await authService.verifyResetToken(token);
      res.json(formatSuccess(result));
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/reset-password',
  validateRequest({ body: resetPasswordSchema }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { token, password } = req.body;
      const result = await authService.resetPassword(token, password);
      res.json(formatSuccess(result));
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/me',
  requireAuth(),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // For MVP just return the userId. In future, fetch user profile here if needed.
      res.json(formatSuccess({ userId: req.user!.id }));
    } catch (err) {
      next(err);
    }
  },
);

// -----------------------------------------------------------------------------
// Google OAuth 2.0 Endpoints
// -----------------------------------------------------------------------------

// GET /api/v1/auth/google — Initiates Google sign-in flow with CSRF protection
router.get(
  '/google',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // 1. Generate cryptographically strong random state for CSRF defense
      const state = crypto.randomBytes(32).toString('hex');

      // 2. Persist state in secure HttpOnly SameSite=Lax cookie (10 min TTL)
      res.cookie('oauth_state', state, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 10 * 60 * 1000,
      });

      const redirectUri = typeof req.query.redirectUri === 'string' ? req.query.redirectUri : undefined;
      const url = googleAuthService.getAuthorizationUrl(state, redirectUri);

      if (req.query.redirect === 'false' || req.headers.accept?.includes('application/json')) {
        res.json(formatSuccess({ url, state }));
        return;
      }

      res.redirect(url);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/v1/auth/google/callback — Google redirects here with authorization code
router.get(
  '/google/callback',
  async (req: AuthenticatedRequest, res: Response, _next: NextFunction) => {
    try {
      const { code, state, error, error_description } = req.query;

      // Handle user cancellation or Google-side errors
      if (error) {
        const errorMsg = String(error_description || error);
        res.redirect(`${config.FRONTEND_URL}/login?error=${encodeURIComponent(errorMsg)}`);
        return;
      }

      // CSRF State Validation: compare returned state with stored cookie
      const stateCookie = req.cookies?.['oauth_state'];
      res.clearCookie('oauth_state');

      if (!state || !stateCookie || state !== stateCookie) {
        res.redirect(
          `${config.FRONTEND_URL}/login?error=${encodeURIComponent('Invalid or expired OAuth state (CSRF detected)')}`,
        );
        return;
      }

      if (!code || typeof code !== 'string') {
        res.redirect(
          `${config.FRONTEND_URL}/login?error=${encodeURIComponent('No authorization code provided by Google')}`,
        );
        return;
      }

      const redirectUri = typeof req.query.redirectUri === 'string' ? req.query.redirectUri : undefined;
      const profile = await googleAuthService.exchangeCodeAndGetProfile(code, redirectUri);
      const result = await authService.loginWithGoogle(profile);

      // Create a short-lived (60s), single-use exchange ticket
      // Prevents exposing sensitive JWT accessToken and refreshToken in redirect URLs/browser history
      const ticket = oAuthTicketStore.createTicket(result);

      res.redirect(`${config.FRONTEND_URL}/auth/google/callback?ticket=${ticket}`);
    } catch (err: any) {
      res.redirect(
        `${config.FRONTEND_URL}/login?error=${encodeURIComponent(err.message || 'Google authentication failed')}`,
      );
    }
  },
);

// POST /api/v1/auth/google/exchange — Single-use ticket exchange to retrieve tokens securely
router.post(
  '/google/exchange',
  validateRequest({ body: googleExchangeSchema }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { ticket } = req.body;
      const result = oAuthTicketStore.consumeTicket(ticket);
      if (!result) {
        throw new UnauthorizedError('Invalid or expired authentication ticket. Please try signing in again.');
      }
      res.json(formatSuccess(result));
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/v1/auth/google/callback — Frontend SPA direct code exchange
router.post(
  '/google/callback',
  validateRequest({ body: googleCallbackSchema }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { code, redirectUri } = req.body;
      const profile = await googleAuthService.exchangeCodeAndGetProfile(code, redirectUri);
      const result = await authService.loginWithGoogle(profile);
      res.json(formatSuccess(result));
    } catch (err) {
      next(err);
    }
  },
);

export const authRouter = router;
export default authRouter;

