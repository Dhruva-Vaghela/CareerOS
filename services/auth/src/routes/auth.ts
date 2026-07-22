import { Router, Response, NextFunction } from 'express';
import { formatSuccess } from '@careeros/errors';
import { validateRequest } from '@careeros/validation';
import { AuthService } from '../services/AuthService.js';
import { registerSchema, loginSchema, refreshSchema, logoutSchema } from '../validation/auth.schema.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();
const authService = new AuthService();

router.post(
  '/register',
  validateRequest({ body: registerSchema }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const user = await authService.register(email, password);
      res.status(201).json(formatSuccess({ user }));
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

export const authRouter = router;
export default authRouter;
