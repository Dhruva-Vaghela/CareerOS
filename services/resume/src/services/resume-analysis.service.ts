import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { z } from 'zod';
import {
  AIOrchestrator,
  PromptLoader,
  PromptManager,
  ProviderFactory,
  type AIRequest,
} from '@careeros/ai-client';
import { ResumeSuggestionModel, type IResumeSuggestionDocument } from '../db/schema.js';
import type { ResumeATSResult } from './resume-ats.service.js';

const itemSchema = z.object({
  title: z.string().trim().min(1).max(120),
  evidence: z.string().trim().min(1).max(600),
  whyItMatters: z.string().trim().min(1).max(400),
}).strict();

const suggestionSchema = z.object({
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  issue: z.string().trim().min(1).max(240),
  action: z.string().trim().min(1).max(500),
  exampleRewrite: z.string().max(600).optional(),
}).strict();

const recruiterFeedbackSchema = z.object({
  firstImpression: z.string().trim().min(1).max(800),
  concerns: z.array(z.string().trim().min(1).max(300)).max(4),
  recommendation: z.string().trim().min(1).max(800),
}).strict();

const analysisSchema = z.object({
  summary: z.string().trim().min(1).max(1000),
  strengths: z.array(itemSchema).min(2).max(5),
  weaknesses: z.array(itemSchema).min(2).max(5),
  suggestions: z.array(suggestionSchema).min(3).max(7),
  recruiterFeedback: recruiterFeedbackSchema,
}).strict();

export type ResumeFeedback = z.infer<typeof analysisSchema>;

export interface ResumeFeedbackResult {
  id: string;
  resumeId: string;
  version: number;
  status: 'COMPLETED' | 'FAILED';
  targetRole?: string;
  hasJobDescription: boolean;
  summary?: string;
  strengths: ResumeFeedback['strengths'];
  weaknesses: ResumeFeedback['weaknesses'];
  suggestions: ResumeFeedback['suggestions'];
  recruiterFeedback?: ResumeFeedback['recruiterFeedback'];
  errorMessage?: string;
  createdAt: Date;
}

interface ResumeAnalysisOptions {
  orchestrator?: Pick<AIOrchestrator, 'execute'>;
  promptManager?: Pick<PromptManager, 'prepare'>;
  createId?: () => string;
}

function toResult(doc: IResumeSuggestionDocument): ResumeFeedbackResult {
  return {
    id: doc._id.toString(),
    resumeId: doc.resumeId,
    version: doc.version,
    status: doc.status,
    targetRole: doc.targetRole,
    hasJobDescription: doc.hasJobDescription,
    summary: doc.summary,
    strengths: doc.strengths,
    weaknesses: doc.weaknesses,
    suggestions: doc.suggestions,
    recruiterFeedback: doc.recruiterFeedback,
    errorMessage: doc.errorMessage,
    createdAt: doc.createdAt,
  };
}

function compactResumeText(text: string): { text: string; truncated: boolean } {
  const maximumCharacters = 28_000;
  if (text.length <= maximumCharacters) return { text, truncated: false };
  const headSize = 20_000;
  const tailSize = maximumCharacters - headSize;
  return {
    text: `${text.slice(0, headSize)}\n\n[Middle of resume omitted to fit analysis limits]\n\n${text.slice(-tailSize)}`,
    truncated: true,
  };
}

function hashInput(resumeText: string, targetRole?: string, jobDescription?: string): string {
  return createHash('sha256')
    .update(JSON.stringify([resumeText, targetRole?.trim() ?? '', jobDescription?.trim() ?? '']))
    .digest('hex');
}

export class ResumeAnalysisService {
  private orchestrator?: Pick<AIOrchestrator, 'execute'>;
  private promptManager?: Pick<PromptManager, 'prepare'>;
  private readonly createId: () => string;

  constructor(options: ResumeAnalysisOptions = {}) {
    this.orchestrator = options.orchestrator;
    this.promptManager = options.promptManager;
    this.createId = options.createId ?? randomUUID;
  }

  private getOrchestrator(): Pick<AIOrchestrator, 'execute'> {
    if (!this.orchestrator) this.orchestrator = new AIOrchestrator(new ProviderFactory());
    return this.orchestrator;
  }

  private getPromptManager(): Pick<PromptManager, 'prepare'> {
    if (!this.promptManager) {
      const promptDirectory = path.resolve(process.cwd(), 'packages/ai-client/prompts');
      this.promptManager = new PromptManager(undefined, undefined, new PromptLoader(promptDirectory));
    }
    return this.promptManager;
  }

  async analyzeAndSave(input: {
    userId: string;
    resumeId: string;
    version: number;
    resumeText: string;
    targetRole?: string;
    jobDescription?: string;
    atsEvaluation?: ResumeATSResult | null;
  }): Promise<ResumeFeedbackResult> {
    const inputHash = hashInput(input.resumeText, input.targetRole, input.jobDescription);
    const context = {
      resume: {
        version: input.version,
        extractedCharacterCount: input.resumeText.length,
        atsEstimate: input.atsEvaluation
          ? {
              score: input.atsEvaluation.score,
              categories: input.atsEvaluation.breakdown.categories,
              matchedKeywords: input.atsEvaluation.breakdown.matchedKeywords,
              missingKeywords: input.atsEvaluation.breakdown.missingKeywords,
            }
          : undefined,
      },
      careerGoal: { targetRole: input.targetRole?.trim() || undefined },
    };
    const compact = compactResumeText(input.resumeText);
    const request: AIRequest = {
      requestId: this.createId(),
      task: 'RESUME_ANALYSIS',
      context,
      input: {
        content: JSON.stringify({
          resumeText: compact.text,
          resumeTextTruncated: compact.truncated,
          targetRole: input.targetRole?.trim() || null,
          jobDescription: input.jobDescription?.trim() || null,
          atsEstimate: context.resume.atsEstimate ?? null,
        }),
      },
      options: { temperature: 0.25, maxOutputTokens: 3500, responseSchema: { type: 'object' } },
      metadata: { userId: input.userId, resumeId: input.resumeId, resumeVersion: input.version },
      timestamp: new Date(),
    };

    try {
      const prepared = await this.getPromptManager().prepare(request);
      const response = await this.getOrchestrator().execute<unknown>(prepared);
      if (!response.success || !response.data) throw new Error('AI feedback generation failed');
      const feedback = analysisSchema.parse(response.data);
      const doc = await ResumeSuggestionModel.create({
        resumeId: input.resumeId,
        version: input.version,
        status: 'COMPLETED',
        targetRole: input.targetRole?.trim() || undefined,
        hasJobDescription: Boolean(input.jobDescription?.trim()),
        inputHash,
        ...feedback,
        createdAt: new Date(),
      });
      return toResult(doc);
    } catch {
      const doc = await ResumeSuggestionModel.create({
        resumeId: input.resumeId,
        version: input.version,
        status: 'FAILED',
        targetRole: input.targetRole?.trim() || undefined,
        hasJobDescription: Boolean(input.jobDescription?.trim()),
        inputHash,
        strengths: [],
        weaknesses: [],
        suggestions: [],
        errorMessage: 'AI resume feedback is temporarily unavailable. Please try again.',
        createdAt: new Date(),
      });
      return toResult(doc);
    }
  }

  async list(resumeId: string, version: number): Promise<ResumeFeedbackResult[]> {
    const docs = await ResumeSuggestionModel.find({ resumeId, version }).sort({ createdAt: -1 }).limit(20);
    return docs.map(toResult);
  }
}
