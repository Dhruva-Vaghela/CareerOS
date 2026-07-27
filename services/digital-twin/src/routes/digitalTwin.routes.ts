import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { DigitalTwinService } from '../services/digitalTwin.service.js';
import { ContextBuilderService } from '../services/contextBuilder.service.js';
import { z } from 'zod';
import { ValidationError } from '@careeros/errors';
import { TwinNodeType, VerificationStatus, ConfidenceLevel, ContextFeature } from '@careeros/shared-types';

export const digitalTwinRouter = Router();
const twinService = new DigitalTwinService();
const contextBuilderService = new ContextBuilderService();

const nodeTypeSchema = z.nativeEnum(TwinNodeType);

const upsertNodeSchema = z.object({
  nodeType: nodeTypeSchema,
  source: z.string().min(1),
  verificationStatus: z.nativeEnum(VerificationStatus).optional(),
  confidenceScore: z.nativeEnum(ConfidenceLevel).optional(),
  metadata: z.record(z.unknown()),
});

const initialTwinSchema = z.object({
  profile: z.record(z.unknown()).optional(),
  goal: z.object({ targetRole: z.string() }).optional(),
  timeline: z.object({ timeline: z.string(), customTimeline: z.string().optional() }).optional(),
  targetCompanies: z.object({ companies: z.array(z.string()) }).optional(),
  preferences: z.record(z.unknown()).optional(),
  resumeMetadata: z.object({
    filename: z.string(),
    secureUrl: z.string(),
    publicId: z.string(),
    size: z.number(),
    uploadDate: z.union([z.string(), z.date()]),
  }).optional(),
});

const contextQuerySchema = z.object({
  features: z.array(z.string()).min(1, 'At least one feature is required'),
});

digitalTwinRouter.get('/', requireAuth(), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const userId = req.user!.id;
    const twin = await twinService.getOrCreateTwin(userId);
    const nodes = await twinService.getAllNodes(userId);
    res.json({ twin, nodes });
  } catch (err) {
    next(err);
  }
});

digitalTwinRouter.post('/', requireAuth(), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const userId = req.user!.id;
    const parseResult = initialTwinSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError('Invalid initial twin payload', parseResult.error.errors);
    }
    const result = await twinService.createInitialTwin(userId, parseResult.data);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

digitalTwinRouter.get('/nodes/:nodeType', requireAuth(), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const userId = req.user!.id;
    const nodeType = req.params.nodeType as TwinNodeType;
    const node = await twinService.getNodeByType(userId, nodeType);
    res.json({ node });
  } catch (err) {
    next(err);
  }
});

digitalTwinRouter.put('/nodes', requireAuth(), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const userId = req.user!.id;
    const parseResult = upsertNodeSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError('Invalid twin node payload', parseResult.error.errors);
    }
    const node = await twinService.upsertNode(userId, parseResult.data);
    res.status(200).json({ node });
  } catch (err) {
    next(err);
  }
});

digitalTwinRouter.post('/context', requireAuth(), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const userId = req.user!.id;
    const parseResult = contextQuerySchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError('Invalid context query payload', parseResult.error.errors);
    }
    const context = await contextBuilderService.buildContext({
      userId,
      features: parseResult.data.features as ContextFeature[],
    });
    res.json({ context });
  } catch (err) {
    next(err);
  }
});
