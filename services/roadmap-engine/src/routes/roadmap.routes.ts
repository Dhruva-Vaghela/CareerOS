import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { RoadmapService } from '../services/roadmap.service.js';
import { formatSuccess, ValidationError } from '@careeros/errors';

export const roadmapRouter = Router();
const roadmapService = new RoadmapService();

const generateRoadmapSchema = z.object({
  goalId: z.string().optional(),
  targetRole: z.string().optional(),
  targetCompanies: z.array(z.string()).optional(),
  targetTimeline: z.string().optional(),
  experienceLevel: z.string().optional(),
  currentSkills: z.array(z.string()).optional(),
});

const toggleChecklistSchema = z.object({
  completed: z.boolean().optional(),
});

const updateNodeSchema = z.object({
  nodeType: z.enum(['MODULE', 'TOPIC']),
  title: z.string().min(1).optional(),
  isDeleted: z.boolean().optional(),
});

// POST /api/v1/roadmaps/generate
roadmapRouter.post('/generate', requireAuth(), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const userId = req.user!.id;
    const parseResult = generateRoadmapSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError('Invalid roadmap generation payload', parseResult.error.errors);
    }

    const roadmap = await roadmapService.generateRoadmap({
      userId,
      ...parseResult.data,
    });

    res.status(201).json(formatSuccess({ roadmap }));
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/roadmaps/active
roadmapRouter.get('/active', requireAuth(), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const userId = req.user!.id;
    const roadmap = await roadmapService.getActiveRoadmap(userId);
    res.json(formatSuccess({ roadmap }));
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/roadmaps/history
roadmapRouter.get('/history', requireAuth(), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const userId = req.user!.id;
    const history = await roadmapService.getRoadmapHistory(userId);
    res.json(formatSuccess({ history }));
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/roadmaps/:id
roadmapRouter.get('/:id', requireAuth(), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const userId = req.user!.id;
    const roadmap = await roadmapService.getRoadmapById(userId, req.params.id);
    res.json(formatSuccess({ roadmap }));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/roadmaps/:id/checklist/:itemId
roadmapRouter.patch('/:id/checklist/:itemId', requireAuth(), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const userId = req.user!.id;
    const parseResult = toggleChecklistSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError('Invalid checklist toggle payload', parseResult.error.errors);
    }

    const result = await roadmapService.toggleChecklistItem(
      userId,
      req.params.id,
      req.params.itemId,
      parseResult.data.completed,
    );

    res.json(formatSuccess(result));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/roadmaps/:id/nodes/:nodeId
roadmapRouter.patch('/:id/nodes/:nodeId', requireAuth(), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const userId = req.user!.id;
    const parseResult = updateNodeSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError('Invalid node update payload', parseResult.error.errors);
    }

    const result = await roadmapService.updateNode(
      userId,
      req.params.id,
      req.params.nodeId,
      parseResult.data.nodeType,
      {
        title: parseResult.data.title,
        isDeleted: parseResult.data.isDeleted,
      },
    );

    res.json(formatSuccess(result));
  } catch (err) {
    next(err);
  }
});
