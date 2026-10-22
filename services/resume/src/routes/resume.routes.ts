import { Router, Response } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { z } from 'zod';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { ResumeService } from '../services/resume.service.js';
import { CloudinaryService, UploadResult } from '../services/cloudinary.service.js';
import { ResumeExtractionService } from '../services/resume-extraction.service.js';
import { ResumeATSService } from '../services/resume-ats.service.js';
import { ResumeAnalysisService } from '../services/resume-analysis.service.js';
import { BadRequestError, NotFoundError } from '@careeros/errors';
import { ResumeStatus } from '@careeros/shared-types';

export const resumeRouter = Router();
const service = new ResumeService();
const cloudinary = new CloudinaryService();
const extractionService = new ResumeExtractionService();
const atsService = new ResumeATSService();
const analysisService = new ResumeAnalysisService();

const uploadsDir = path.resolve(process.cwd(), 'services/resume/uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.memoryStorage();
const allowedExtensions = new Set(['.pdf', '.docx']);
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const validMime = file.mimetype === 'application/pdf'
      || file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      || file.mimetype === 'application/octet-stream';
    if (!allowedExtensions.has(extension) || !validMime) {
      callback(new BadRequestError('Only PDF and DOCX resumes are supported'));
      return;
    }
    callback(null, true);
  },
});

const metadataSchema = z.object({
  publicId: z.string().min(1),
  secureUrl: z.string().url(),
  filename: z.string().min(1),
  mimeType: z.string().optional(),
  size: z.coerce.number().int().nonnegative().optional(),
});
const atsContextSchema = z.object({
  targetRole: z.string().trim().max(160).optional(),
  jobDescription: z.string().trim().max(20_000).optional(),
  requirements: z.object({
    requiredSkills: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
    minimumYearsExperience: z.coerce.number().int().min(0).max(60).optional(),
    requiredEducation: z.string().trim().max(120).optional(),
    requiredLocation: z.string().trim().max(120).optional(),
  }).optional(),
});

function parseATSContext(value: unknown): { targetRole?: string; jobDescription?: string; requirements?: { requiredSkills?: string[]; minimumYearsExperience?: number; requiredEducation?: string; requiredLocation?: string } } {
  let normalized = value;
  if (value && typeof value === 'object' && !Array.isArray(value) && typeof (value as Record<string, unknown>).requirements === 'string') {
    try { normalized = { ...value as Record<string, unknown>, requirements: JSON.parse((value as Record<string, string>).requirements) }; }
    catch { throw new BadRequestError('ATS screening rules must be valid JSON'); }
  }
  const parsed = atsContextSchema.safeParse(normalized);
  if (!parsed.success) throw new BadRequestError('Invalid ATS criteria. Check role, job description, and screening rule limits.');
  return parsed.data;
}

async function extractAndScore(
  userId: string,
  resume: { id: string; version: number; filename: string },
  buffer: Buffer | undefined,
  context: { targetRole?: string; jobDescription?: string; requirements?: { requiredSkills?: string[]; minimumYearsExperience?: number; requiredEducation?: string; requiredLocation?: string } },
) {
  if (!buffer) return { extraction: null, ats: null, feedback: null };
  const extraction = await extractionService.extractAndSave({
    resumeId: resume.id,
    version: resume.version,
    filename: resume.filename,
    buffer,
  });
  const ats = extraction.status === 'COMPLETED'
    ? await atsService.evaluateAndSave({
        resumeId: resume.id,
        version: resume.version,
        extraction: extraction.parsedContent,
        ...context,
      })
    : null;
  const feedback = extraction.status === 'COMPLETED'
    ? await analysisService.analyzeAndSave({
        userId,
        resumeId: resume.id,
        version: resume.version,
        resumeText: extraction.parsedContent.plainText ?? '',
        ...context,
        atsEvaluation: ats,
      })
    : null;
  return { extraction, ats, feedback };
}

function safeFilename(filename: string): string {
  return path.basename(filename).replace(/[^a-zA-Z0-9.-]/g, '_');
}

function localVersionFilename(resumeId: string, version: number, filename: string): string {
  return `${resumeId}_v${version}_${safeFilename(filename)}`;
}

async function getUploadData(req: AuthenticatedRequest): Promise<{ data: UploadResult; buffer?: Buffer }> {
  if (req.file) {
    return {
      data: await cloudinary.uploadBuffer(req.file.buffer, req.file.originalname, req.file.mimetype),
      buffer: req.file.buffer,
    };
  }
  const parsed = metadataSchema.safeParse(req.body);
  if (!parsed.success) throw new BadRequestError('Upload a PDF/DOCX file or provide valid resume metadata');
  return {
    data: {
      ...parsed.data,
      mimeType: parsed.data.mimeType || 'application/pdf',
      size: parsed.data.size || 0,
    },
  };
}

async function persistLocalCopy(
  resume: { id: string; version: number; filename: string; secureUrl: string },
  uploadData: UploadResult,
  buffer?: Buffer,
): Promise<void> {
  if (!buffer || !uploadData.secureUrl.includes('demo/image/upload')) return;
  fs.writeFileSync(path.join(uploadsDir, localVersionFilename(resume.id, resume.version, resume.filename)), buffer);
  const secureUrl = `/api/v1/resume/file/${resume.id}/${resume.version}`;
  await service.updateSecureUrl(resume.id, resume.version, secureUrl);
  resume.secureUrl = secureUrl;
}

function removeLocalCopies(resumeId: string): void {
  for (const filename of fs.readdirSync(uploadsDir)) {
    if (filename.startsWith(`${resumeId}_`)) fs.unlinkSync(path.join(uploadsDir, filename));
  }
}

resumeRouter.get('/latest', requireAuth(), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    res.json({ resume: await service.getLatestResume(req.user!.id) });
  } catch (err) { next(err); }
});

resumeRouter.get('/file/:id/:version?', requireAuth(), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const currentResume = req.params.version ? null : await service.getResume(req.user!.id, req.params.id);
    const versionNumber = req.params.version ? Number(req.params.version) : currentResume!.version;
    if (!Number.isInteger(versionNumber) || versionNumber < 1) throw new BadRequestError('Invalid resume version');
    const version = await service.getVersion(req.user!.id, req.params.id, versionNumber);
    let filePath = path.join(uploadsDir, localVersionFilename(req.params.id, versionNumber, version.filename));
    // Older local uploads used a resume-id/filename path without a version segment.
    if (!fs.existsSync(filePath) && !req.params.version) {
      const legacyName = fs.readdirSync(uploadsDir).find((filename) => filename.startsWith(`${req.params.id}_`));
      if (legacyName) filePath = path.join(uploadsDir, legacyName);
    }
    if (!fs.existsSync(filePath)) throw new NotFoundError('Resume file is not available locally');
    res.setHeader('Content-Type', version.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename(version.filename)}"`);
    return res.sendFile(filePath);
  } catch (err) { next(err); }
});

resumeRouter.get('/', requireAuth(), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    res.json({ resumes: await service.listResumes(req.user!.id) });
  } catch (err) { next(err); }
});

resumeRouter.get('/:id/versions', requireAuth(), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    res.json({ versions: await service.getVersions(req.user!.id, req.params.id) });
  } catch (err) { next(err); }
});

resumeRouter.get('/:id/versions/:version', requireAuth(), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const versionNumber = Number(req.params.version);
    if (!Number.isInteger(versionNumber) || versionNumber < 1) throw new BadRequestError('Invalid resume version');
    res.json({ version: await service.getVersion(req.user!.id, req.params.id, versionNumber) });
  } catch (err) { next(err); }
});

resumeRouter.get('/:id/versions/:version/extraction', requireAuth(), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const versionNumber = Number(req.params.version);
    if (!Number.isInteger(versionNumber) || versionNumber < 1) throw new BadRequestError('Invalid resume version');
    await service.getVersion(req.user!.id, req.params.id, versionNumber);
    res.json({ extraction: await extractionService.get(req.params.id, versionNumber) });
  } catch (err) { next(err); }
});

resumeRouter.get('/:id/versions/:version/ats/history', requireAuth(), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const versionNumber = Number(req.params.version);
    if (!Number.isInteger(versionNumber) || versionNumber < 1) throw new BadRequestError('Invalid resume version');
    await service.getVersion(req.user!.id, req.params.id, versionNumber);
    res.json({ evaluations: await atsService.list(req.params.id, versionNumber) });
  } catch (err) { next(err); }
});

resumeRouter.get('/:id/versions/:version/ats', requireAuth(), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const versionNumber = Number(req.params.version);
    if (!Number.isInteger(versionNumber) || versionNumber < 1) throw new BadRequestError('Invalid resume version');
    await service.getVersion(req.user!.id, req.params.id, versionNumber);
    const evaluations = await atsService.list(req.params.id, versionNumber);
    res.json({ evaluation: evaluations[0] ?? null });
  } catch (err) { next(err); }
});

resumeRouter.post('/:id/versions/:version/ats', requireAuth(), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const versionNumber = Number(req.params.version);
    if (!Number.isInteger(versionNumber) || versionNumber < 1) throw new BadRequestError('Invalid resume version');
    await service.getVersion(req.user!.id, req.params.id, versionNumber);
    const context = parseATSContext(req.body);
    const extraction = await extractionService.get(req.params.id, versionNumber);
    if (!extraction || extraction.status !== 'COMPLETED') {
      throw new BadRequestError('This resume version has no readable extracted text to evaluate');
    }
    const evaluation = await atsService.evaluateAndSave({
      resumeId: req.params.id,
      version: versionNumber,
      extraction: extraction.parsedContent,
      ...context,
    });
    res.status(201).json({ evaluation, label: 'ATS-style screening simulation based on visible resume text and supplied criteria; it does not reproduce a specific employer system.' });
  } catch (err) { next(err); }
});

resumeRouter.get('/:id/versions/:version/feedback/history', requireAuth(), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const versionNumber = Number(req.params.version);
    if (!Number.isInteger(versionNumber) || versionNumber < 1) throw new BadRequestError('Invalid resume version');
    await service.getVersion(req.user!.id, req.params.id, versionNumber);
    res.json({ feedback: await analysisService.list(req.params.id, versionNumber) });
  } catch (err) { next(err); }
});

resumeRouter.get('/:id/versions/:version/feedback', requireAuth(), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const versionNumber = Number(req.params.version);
    if (!Number.isInteger(versionNumber) || versionNumber < 1) throw new BadRequestError('Invalid resume version');
    await service.getVersion(req.user!.id, req.params.id, versionNumber);
    const feedback = await analysisService.list(req.params.id, versionNumber);
    res.json({ feedback: feedback[0] ?? null });
  } catch (err) { next(err); }
});

resumeRouter.post('/:id/versions/:version/feedback', requireAuth(), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const versionNumber = Number(req.params.version);
    if (!Number.isInteger(versionNumber) || versionNumber < 1) throw new BadRequestError('Invalid resume version');
    await service.getVersion(req.user!.id, req.params.id, versionNumber);
    const context = parseATSContext(req.body);
    const extraction = await extractionService.get(req.params.id, versionNumber);
    if (!extraction || extraction.status !== 'COMPLETED' || !extraction.parsedContent.plainText) {
      throw new BadRequestError('This resume version has no readable extracted text to analyze');
    }
    const atsEvaluations = await atsService.list(req.params.id, versionNumber);
    const feedback = await analysisService.analyzeAndSave({
      userId: req.user!.id,
      resumeId: req.params.id,
      version: versionNumber,
      resumeText: extraction.parsedContent.plainText,
      ...context,
      atsEvaluation: atsEvaluations[0] ?? null,
    });
    res.status(feedback.status === 'COMPLETED' ? 201 : 503).json({ feedback });
  } catch (err) { next(err); }
});

resumeRouter.post('/upload', requireAuth(), upload.single('file'), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const context = parseATSContext(req.body);
    const { data, buffer } = await getUploadData(req);
    const resume = await service.createResume(req.user!.id, data, typeof req.body.name === 'string' ? req.body.name : undefined);
    await persistLocalCopy(resume, data, buffer);
    const analysis = await extractAndScore(req.user!.id, resume, buffer, context);
    res.status(201).json({ resume, ...analysis });
  } catch (err) { next(err); }
});

resumeRouter.post('/:id/versions', requireAuth(), upload.single('file'), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const context = parseATSContext(req.body);
    const { data, buffer } = await getUploadData(req);
    const resume = await service.appendVersion(req.user!.id, req.params.id, data);
    await persistLocalCopy(resume, data, buffer);
    const analysis = await extractAndScore(req.user!.id, resume, buffer, context);
    res.status(201).json({ resume, ...analysis });
  } catch (err) { next(err); }
});

// Compatibility endpoint used by the existing Resume Center. With resumeId it appends
// to that item; without one it appends to the latest active item (or creates the first).
resumeRouter.post('/replace', requireAuth(), upload.single('file'), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const context = parseATSContext(req.body);
    const { data, buffer } = await getUploadData(req);
    const resumeId = typeof req.body.resumeId === 'string' ? req.body.resumeId : undefined;
    const existing = resumeId ? await service.getResume(req.user!.id, resumeId) : await service.getLatestResume(req.user!.id);
    const resume = existing
      ? await service.appendVersion(req.user!.id, existing.id, data)
      : await service.createResume(req.user!.id, data);
    await persistLocalCopy(resume, data, buffer);
    const analysis = await extractAndScore(req.user!.id, resume, buffer, context);
    res.json({ resume, ...analysis });
  } catch (err) { next(err); }
});

resumeRouter.get('/:id', requireAuth(), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    res.json({ resume: await service.getResume(req.user!.id, req.params.id) });
  } catch (err) { next(err); }
});

resumeRouter.patch('/:id', requireAuth(), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const changesSchema = z.object({
      name: z.string().trim().min(1).max(120).optional(),
      status: z.nativeEnum(ResumeStatus).optional(),
    }).refine((changes) => Object.keys(changes).length > 0, 'Provide a name or status to update');
    const changes = changesSchema.safeParse(req.body);
    if (!changes.success) throw new BadRequestError('Invalid resume update');
    res.json({ resume: await service.updateResume(req.user!.id, req.params.id, changes.data) });
  } catch (err) { next(err); }
});

resumeRouter.delete('/:id?', requireAuth(), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const userId = req.user!.id;
    const resumeId = req.params.id;
    if (resumeId) {
      await service.deleteResume(userId, resumeId);
      removeLocalCopies(resumeId);
    } else {
      const latest = await service.getLatestResume(userId);
      if (!latest) throw new NotFoundError('No active resume found to delete');
      await service.deleteResume(userId, latest.id);
      removeLocalCopies(latest.id);
    }
    res.json({ success: true, message: 'Resume deleted successfully' });
  } catch (err) { next(err); }
});
