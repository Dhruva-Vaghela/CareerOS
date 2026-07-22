import { Router, Response, NextFunction } from 'express';
import { formatSuccess } from '@careeros/errors';
import { validateRequest } from '@careeros/validation';
import { ProfileService } from '../services/ProfileService.js';
import { createProfileSchema, updateProfileSchema } from '../validation/profile.schema.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();
const profileService = new ProfileService();

// GET /api/v1/profile — Retrieve the authenticated user's profile
router.get(
  '/',
  requireAuth(),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const profile = await profileService.getProfile(userId);

      if (!profile) {
        // Profile doesn't exist yet — user hasn't completed onboarding
        res.json(formatSuccess({
          profile: null,
          completion: { percentage: 0, missingFields: ['fullName', 'targetRole'], isComplete: false },
        }));
        return;
      }

      const completion = profileService.getCompletionInfo(profile);
      res.json(formatSuccess({ profile, completion }));
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/v1/profile — Create or fully replace the user's profile (onboarding)
router.put(
  '/',
  requireAuth(),
  validateRequest({ body: createProfileSchema }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const profile = await profileService.createOrReplaceProfile(userId, req.body);
      const completion = profileService.getCompletionInfo(profile);
      res.json(formatSuccess({ profile, completion }));
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/v1/profile — Partially update the user's profile
router.patch(
  '/',
  requireAuth(),
  validateRequest({ body: updateProfileSchema }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const profile = await profileService.updateProfile(userId, req.body);
      const completion = profileService.getCompletionInfo(profile);
      res.json(formatSuccess({ profile, completion }));
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/v1/profile/completion — Get profile completion status
router.get(
  '/completion',
  requireAuth(),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const profile = await profileService.getProfile(userId);

      if (!profile) {
        res.json(formatSuccess({
          percentage: 0,
          missingFields: ['fullName', 'targetRole'],
          isComplete: false,
        }));
        return;
      }

      const completion = profileService.getCompletionInfo(profile);
      res.json(formatSuccess(completion));
    } catch (err) {
      next(err);
    }
  },
);

export const profileRouter = router;
export default profileRouter;
