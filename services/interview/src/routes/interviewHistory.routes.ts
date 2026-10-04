import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { CompanyInterviewService } from '../services/companyInterview.service.js';

export const interviewHistoryRouter = Router();
const service = new CompanyInterviewService();

/**
 * GET /api/v1/interviews/history
 */
interviewHistoryRouter.get(
  '/history',
  requireAuth(),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const userId = req.user!.id;
      const history = await service.listUserHistory(userId);
      res.json({ history });
    } catch (err) {
      next(err);
    }
  },
);
