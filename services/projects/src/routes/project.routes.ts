import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth.js';
import { projectService } from '../services/project.service.js';
import { githubService } from '../services/github.service.js';
import { BadRequestError } from '@careeros/errors';

export const projectRouter = Router();

const connectGithubSchema = z.object({
  username: z.string().min(1, 'GitHub username is required'),
});

const oauthCallbackSchema = z.object({
  code: z.string().min(1, 'OAuth authorization code is required'),
});

const updateProjectSchema = z.object({
  description: z.string().optional(),
  status: z.enum(['Completed', 'In Progress', 'Active', 'Archived']).optional(),
});

const submitProjectSchema = z.object({
  projectBriefId: z.string().min(1, 'projectBriefId is required'),
  submissionUrl: z.string().url('Must be a valid URL'),
});

// GET /api/v1/projects - list user projects
projectRouter.get('/', requireAuth(), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const userId = req.user!.id;
    const { search, language, status } = req.query;

    const projects = await projectService.getProjects(userId, {
      search: typeof search === 'string' ? search : undefined,
      language: typeof language === 'string' ? language : undefined,
      status: typeof status === 'string' ? status : undefined,
    });

    res.json({
      success: true,
      data: projects,
      count: projects.length,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/projects/account - get connected GitHub account
projectRouter.get('/account', requireAuth(), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const userId = req.user!.id;
    const account = await projectService.getGithubAccount(userId);
    res.json({
      success: true,
      data: account,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/projects/github/connect - connect by username
projectRouter.post('/github/connect', requireAuth(), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const parse = connectGithubSchema.safeParse(req.body);
    if (!parse.success) {
      throw new BadRequestError(parse.error.errors[0].message);
    }

    const userId = req.user!.id;
    const result = await projectService.connectAndSyncByUsername(userId, parse.data.username);

    res.json({
      success: true,
      message: `Successfully connected GitHub user @${result.account.githubUsername}`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/projects/github/oauth-url - get OAuth redirect URL
projectRouter.post('/github/oauth-url', requireAuth(), (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const state = req.user!.id;
    const url = githubService.getOAuthAuthorizeUrl(state);
    res.json({
      success: true,
      data: { url },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/projects/github/callback - handle OAuth callback code
projectRouter.post('/github/callback', requireAuth(), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const parse = oauthCallbackSchema.safeParse(req.body);
    if (!parse.success) {
      throw new BadRequestError(parse.error.errors[0].message);
    }

    const userId = req.user!.id;
    const result = await projectService.connectAndSyncByOAuth(userId, parse.data.code);

    res.json({
      success: true,
      message: `Successfully connected GitHub via OAuth for @${result.account.githubUsername}`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/projects/github/sync - re-sync existing connected account
projectRouter.post('/github/sync', requireAuth(), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const userId = req.user!.id;
    const result = await projectService.syncExistingAccount(userId);

    res.json({
      success: true,
      message: 'Repositories refreshed successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/projects/github/disconnect - disconnect GitHub account
projectRouter.delete('/github/disconnect', requireAuth(), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const userId = req.user!.id;
    await projectService.disconnectAccount(userId);
    res.json({
      success: true,
      message: 'GitHub account disconnected',
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/projects/:id - update project details (description, status)
projectRouter.patch('/:id', requireAuth(), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const parse = updateProjectSchema.safeParse(req.body);
    if (!parse.success) {
      throw new BadRequestError(parse.error.errors[0].message);
    }

    const userId = req.user!.id;
    const updated = await projectService.updateProject(userId, req.params.id, parse.data);

    res.json({
      success: true,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/projects/:id - delete a project
projectRouter.delete('/:id', requireAuth(), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const userId = req.user!.id;
    await projectService.deleteProject(userId, req.params.id);
    res.json({
      success: true,
      message: 'Project removed',
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/projects/suggested - suggested briefs (Architecture §12)
projectRouter.get('/suggested', requireAuth(), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const moduleId = typeof req.query.moduleId === 'string' ? req.query.moduleId : undefined;
    const briefs = await projectService.getSuggestedBriefs(moduleId);
    res.json({
      success: true,
      data: briefs,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/projects/submissions - submit brief (Architecture §12)
projectRouter.post('/submissions', requireAuth(), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const parse = submitProjectSchema.safeParse(req.body);
    if (!parse.success) {
      throw new BadRequestError(parse.error.errors[0].message);
    }

    const userId = req.user!.id;
    const submission = await projectService.submitProject(
      userId,
      parse.data.projectBriefId,
      parse.data.submissionUrl,
    );

    res.status(201).json({
      success: true,
      data: submission,
    });
  } catch (err) {
    next(err);
  }
});
