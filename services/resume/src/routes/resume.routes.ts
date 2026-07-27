import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { ResumeService } from '../services/resume.service.js';
import { CloudinaryService } from '../services/cloudinary.service.js';
import { BadRequestError, NotFoundError } from '@careeros/errors';

export const resumeRouter = Router();
const service = new ResumeService();
const cloudinary = new CloudinaryService();

// Local uploads directory for dev environment PDF serving
const uploadsDir = path.resolve(process.cwd(), 'services/resume/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Endpoint to fetch latest active resume
resumeRouter.get('/latest', requireAuth(), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const userId = req.user!.id;
    const resume = await service.getLatestResume(userId);
    res.json({ resume });
  } catch (err) {
    next(err);
  }
});

// Endpoint to serve actual uploaded PDF file for inline previewing
resumeRouter.get('/file/:id', async (req, res, next) => {
  try {
    const resumeId = req.params.id;
    const files = fs.readdirSync(uploadsDir);
    const matchingFile = files.find((f) => f.startsWith(`${resumeId}_`));

    if (!matchingFile) {
      // Fallback sample PDF if specific file not found on disk
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="resume.pdf"');
      const samplePdfPath = path.resolve(process.cwd(), 'services/resume/uploads/sample.pdf');
      if (fs.existsSync(samplePdfPath)) {
        return res.sendFile(samplePdfPath);
      }
      throw new NotFoundError('Resume file not found on disk');
    }

    const filePath = path.join(uploadsDir, matchingFile);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    return res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
});

// Endpoint to upload a new resume file
resumeRouter.post(
  '/upload',
  requireAuth(),
  upload.single('file'),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const userId = req.user!.id;

      if (req.file) {
        // 1. Upload to Cloudinary (or fallback)
        const uploadResult = await cloudinary.uploadBuffer(
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype,
        );

        // 2. Save metadata to Database
        const resume = await service.saveResume(userId, uploadResult);

        // 3. Save file copy locally for dev PDF preview
        const localFileName = `${resume.id}_${req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        fs.writeFileSync(path.join(uploadsDir, localFileName), req.file.buffer);

        // 4. Update secureUrl to point to local preview endpoint if Cloudinary returned mock fallback
        if (uploadResult.secureUrl.includes('demo/image/upload')) {
          resume.secureUrl = `/api/v1/resume/file/${resume.id}`;
        }

        res.status(201).json({ resume });
        return;
      }

      const { publicId, secureUrl, filename, mimeType, size } = req.body;
      if (!publicId || !secureUrl || !filename) {
        throw new BadRequestError('Either file or publicId/secureUrl/filename must be provided');
      }

      const resume = await service.saveResume(userId, {
        publicId,
        secureUrl,
        filename,
        mimeType: mimeType || 'application/pdf',
        size: Number(size) || 0,
      });

      res.status(201).json({ resume });
    } catch (err) {
      next(err);
    }
  },
);

// Endpoint to replace active resume
resumeRouter.post(
  '/replace',
  requireAuth(),
  upload.single('file'),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const userId = req.user!.id;
      if (req.file) {
        const uploadResult = await cloudinary.uploadBuffer(
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype,
        );
        const resume = await service.saveResume(userId, uploadResult);

        // Save local copy for preview
        const localFileName = `${resume.id}_${req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        fs.writeFileSync(path.join(uploadsDir, localFileName), req.file.buffer);

        if (uploadResult.secureUrl.includes('demo/image/upload')) {
          resume.secureUrl = `/api/v1/resume/file/${resume.id}`;
        }

        res.status(200).json({ resume });
        return;
      }

      const { publicId, secureUrl, filename, mimeType, size } = req.body;
      if (!publicId || !secureUrl || !filename) {
        throw new BadRequestError('Either file or publicId/secureUrl/filename must be provided');
      }

      const resume = await service.saveResume(userId, {
        publicId,
        secureUrl,
        filename,
        mimeType: mimeType || 'application/pdf',
        size: Number(size) || 0,
      });

      res.status(200).json({ resume });
    } catch (err) {
      next(err);
    }
  },
);

// Endpoint to delete resume metadata
resumeRouter.delete('/:id?', requireAuth(), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const userId = req.user!.id;
    const resumeId = req.params.id;
    const active = await service.getLatestResume(userId);

    if (active) {
      // Clean up local disk file if exists
      const files = fs.readdirSync(uploadsDir);
      const matchingFile = files.find((f) => f.startsWith(`${active.id}_`));
      if (matchingFile) {
        fs.unlinkSync(path.join(uploadsDir, matchingFile));
      }
    }

    await service.deleteResume(userId, resumeId);
    res.json({ success: true, message: 'Resume deleted successfully' });
  } catch (err) {
    next(err);
  }
});
