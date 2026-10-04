import { Router, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { validateRequest } from '@careeros/validation';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { CompanyInterviewService } from '../services/companyInterview.service.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max audio
});

const startSchema = {
  body: z.object({
    companyName: z.string().min(1),
    jobRole: z.string().min(1),
    experienceLevel: z.string().min(1),
    roundType: z.string().min(1),
    companyProfileId: z.string().optional(),
    questionsCount: z.number().int().min(1).max(10).optional(),
  }),
};

export const companyInterviewRouter = Router();
const service = new CompanyInterviewService();

/**
 * GET /api/v1/interviews/company/profiles
 */
companyInterviewRouter.get(
  '/profiles',
  async (_req: AuthenticatedRequest, res: Response, next) => {
    try {
      const profiles = await service.listProfiles();
      res.json({ profiles });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /api/v1/interviews/company/start
 */
companyInterviewRouter.post(
  '/start',
  requireAuth(),
  validateRequest(startSchema),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const userId = req.user!.id;
      const { companyName, jobRole, experienceLevel, roundType, companyProfileId, questionsCount } = req.body;

      const result = await service.startInterview({
        userId,
        companyName,
        jobRole,
        experienceLevel,
        roundType,
        companyProfileId,
        questionsCount,
      });

      res.status(201).json({
        sessionId: result.session._id,
        session: result.session,
        firstQuestion: result.firstQuestion,
        totalQuestions: result.totalQuestions,
        audioBase64: result.audioBase64,
      });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/v1/interviews/company/:id
 */
companyInterviewRouter.get(
  '/:id',
  requireAuth(),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const userId = req.user!.id;
      const sessionId = req.params.id;

      const state = await service.getSessionState(sessionId, userId);
      res.json(state);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /api/v1/interviews/company/:id/respond
 * Accepts both application/json (responseText) and multipart/form-data (audio file + text)
 */
companyInterviewRouter.post(
  '/:id/respond',
  requireAuth(),
  upload.single('audio'),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const userId = req.user!.id;
      const sessionId = req.params.id;
      const questionId = req.body.questionId;
      const responseText = req.body.responseText;

      const audioBuffer = req.file?.buffer;
      const audioFilename = req.file?.originalname;

      const result = await service.submitResponse({
        sessionId,
        questionId,
        userId,
        responseText,
        audioBuffer,
        audioFilename,
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/v1/interviews/company/:id/evaluation
 */
companyInterviewRouter.get(
  '/:id/evaluation',
  requireAuth(),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const userId = req.user!.id;
      const sessionId = req.params.id;

      const feedback = await service.getFeedback(sessionId, userId);
      res.json({ feedback });
    } catch (err) {
      next(err);
    }
  },
);
