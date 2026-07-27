import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { CareerGoalService } from '../services/careerGoal.service.js';
import { z } from 'zod';
import { ValidationError } from '@careeros/errors';

export const careerGoalRouter = Router();
const service = new CareerGoalService();

const upsertSchema = z.object({
  targetRole: z.string().min(1, 'Target role is required'),
  targetCompanies: z.array(z.string()).optional().default([]),
  timeline: z.string().min(1, 'Timeline is required'),
  customTimeline: z.string().optional(),
});

careerGoalRouter.get('/active', requireAuth(), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const userId = req.user!.id;
    const goal = await service.getActiveGoal(userId);
    res.json({ goal });
  } catch (err) {
    next(err);
  }
});

careerGoalRouter.post('/', requireAuth(), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const userId = req.user!.id;
    const parseResult = upsertSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError('Invalid career goal payload', parseResult.error.errors);
    }
    const goal = await service.upsertGoal(userId, parseResult.data);
    res.status(200).json({ goal });
  } catch (err) {
    next(err);
  }
});

careerGoalRouter.put('/', requireAuth(), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const userId = req.user!.id;
    const parseResult = upsertSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError('Invalid career goal payload', parseResult.error.errors);
    }
    const goal = await service.upsertGoal(userId, parseResult.data);
    res.status(200).json({ goal });
  } catch (err) {
    next(err);
  }
});
