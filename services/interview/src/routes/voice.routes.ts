import { Router, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { validateRequest } from '@careeros/validation';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { SarvamVoiceService } from '../services/sarvamVoice.service.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

export const voiceRouter = Router();
const voiceService = new SarvamVoiceService();

const synthesizeSchema = {
  body: z.object({
    text: z.string().min(1).max(1000),
    languageCode: z.string().optional(),
    speaker: z.string().optional(),
  }),
};

/**
 * POST /api/v1/interviews/voice/transcribe
 */
voiceRouter.post(
  '/transcribe',
  requireAuth(),
  upload.single('audio'),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      if (!req.file || !req.file.buffer) {
        res.status(400).json({ error: 'Audio file is required for transcription' });
        return;
      }

      const languageCode = (req.body.languageCode as string) || 'en-IN';
      const result = await voiceService.transcribeAudio(
        req.file.buffer,
        req.file.originalname || 'recording.webm',
        languageCode,
      );

      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /api/v1/interviews/voice/synthesize
 */
voiceRouter.post(
  '/synthesize',
  requireAuth(),
  validateRequest(synthesizeSchema),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const { text, languageCode, speaker } = req.body;
      const result = await voiceService.synthesizeSpeech(
        text,
        languageCode || 'en-IN',
        speaker || 'priya',
      );

      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);
