import { Router, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { formatSuccess, ValidationError } from '@careeros/errors';
import { AssessmentType as SharedAssessmentType, type AssessmentScoredEvent } from '@careeros/shared-types';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { AssessmentScoringService } from '../scoring.service.js';
import { AssessmentAttemptModel, AssessmentModel } from '../assessment.model.js';
import { AssessmentGenerationService } from '../assessment-generation.service.js';
import { toPublicAssessment } from '../assessment.response.js';
import { getEventBus } from '../bus.js';

export const assessmentRouter = Router();
const scoringService = new AssessmentScoringService();
const generationService = new AssessmentGenerationService();

const generationSchema = z.object({
  targetRole: z.string().trim().min(1),
  roadmapId: z.string().min(1),
  roadmapVersion: z.number().int().positive(),
  moduleId: z.string().min(1),
  moduleTitle: z.string().trim().min(1),
  topicId: z.string().min(1),
  topicTitle: z.string().trim().min(1),
  topicDescription: z.string().optional(),
  skillNames: z.array(z.string().trim().min(1)).default([]),
  skillIds: z.array(z.string().min(1)).optional(),
  topicContexts: z.array(z.object({
    id: z.string().min(1),
    title: z.string().trim().min(1),
    description: z.string().optional(),
    skillNames: z.array(z.string().trim().min(1)),
    skillIds: z.array(z.string().min(1)),
  })).optional(),
  type: z.enum(['TOPIC_QUIZ', 'MODULE_ASSESSMENT']).default('TOPIC_QUIZ'),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('MEDIUM'),
  duration: z.number().int().positive().default(15),
  totalQuestions: z.number().int().min(3).max(10).default(5),
});

const answerEntrySchema = z.object({
  questionId: z.string().min(1),
  answer: z.union([z.string(), z.array(z.string()), z.null()]),
});

const submitSchema = z.object({
  assessmentId: z.string().min(1),
  answers: z.union([
    z.record(z.union([z.string(), z.array(z.string()), z.undefined()])).default({}),
    z.array(answerEntrySchema),
  ]).default({}),
  attemptId: z.string().optional(),
});

assessmentRouter.get('/', requireAuth(), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const assessments = await AssessmentModel.find({ userId: req.user!.id }).sort({ createdAt: -1 }).lean();
    res.json(formatSuccess({ assessments: assessments.map(toPublicAssessment) }));
  } catch (err) {
    next(err);
  }
});

assessmentRouter.post('/', requireAuth(), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const parseResult = generationSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError('Invalid assessment creation payload', parseResult.error.errors);
    }

    const assessment = await generationService.generate({
      userId: req.user!.id,
      ...parseResult.data,
    });
    res.status(201).json(formatSuccess({ assessment: toPublicAssessment(assessment.toObject()) }));
  } catch (err) {
    next(err);
  }
});

assessmentRouter.post('/:id/attempts', requireAuth(), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const userId = req.user!.id;
    const assessment = await AssessmentModel.findOne({ _id: req.params.id, userId }).lean();
    if (!assessment) return res.status(404).json({ error: { message: 'Assessment not found.' } });
    const attemptNumber = await AssessmentAttemptModel.countDocuments({ assessmentId: assessment._id, studentId: userId }) + 1;
    const attempt = await AssessmentAttemptModel.create({
      _id: randomUUID(),
      assessmentId: assessment._id,
      studentId: userId,
      startedAt: new Date(),
      status: 'IN_PROGRESS',
      attemptNumber,
    });
    res.status(201).json(formatSuccess({ attempt: attempt.toObject() }));
  } catch (err) {
    next(err);
  }
});

assessmentRouter.post('/:id/attempts/:attemptId/submit', requireAuth(), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const userId = req.user!.id;
    const parseResult = submitSchema.safeParse({ ...req.body, assessmentId: req.params.id, attemptId: req.params.attemptId });
    if (!parseResult.success) {
      throw new ValidationError('Invalid attempt submission payload', parseResult.error.errors);
    }

    const [assessment, attempt] = await Promise.all([
      AssessmentModel.findOne({ _id: req.params.id, userId }).lean(),
      AssessmentAttemptModel.findOne({ _id: req.params.attemptId, assessmentId: req.params.id, studentId: userId }),
    ]);
    if (!assessment || !attempt) return res.status(404).json({ error: { message: 'Assessment attempt not found.' } });
    if (attempt.status !== 'IN_PROGRESS') return res.status(409).json({ error: { message: 'This attempt has already been submitted.' } });

    const questions = assessment.questions;

    const result = scoringService.scoreAttempt({
      assessmentId: req.params.id,
      attemptId: req.params.attemptId,
      answers: parseResult.data.answers,
      questions,
    });

    const submittedAt = new Date();
    attempt.status = 'SUBMITTED';
    attempt.submittedAt = submittedAt;
    attempt.score = result.percentage;
    attempt.percentage = result.percentage;
    attempt.totalMarks = result.totalMarks;
    attempt.obtainedMarks = result.obtainedMarks;
    attempt.correctAnswers = result.correctAnswers;
    attempt.incorrectAnswers = result.incorrectAnswers;
    attempt.unansweredQuestions = result.unansweredQuestions;
    attempt.set('questionResults', result.questionResults);
    attempt.set('topicPerformance', result.topicPerformance);
    attempt.set('skillPerformance', result.skillPerformance);
    attempt.set('answers', Array.isArray(parseResult.data.answers)
      ? Object.fromEntries(parseResult.data.answers.map((answer) => [answer.questionId, answer.answer]))
      : parseResult.data.answers);
    await attempt.save();

    const payload = {
      attemptId: req.params.attemptId,
      assessmentId: req.params.id,
      studentId: userId,
      status: 'SUBMITTED',
      score: result.percentage,
      percentage: result.percentage,
      totalMarks: result.totalMarks,
      obtainedMarks: result.obtainedMarks,
      correctAnswers: result.correctAnswers,
      incorrectAnswers: result.incorrectAnswers,
      unansweredQuestions: result.unansweredQuestions,
      skillPerformance: result.skillPerformance,
      topicPerformance: result.topicPerformance,
      questionReview: questions.map((question) => ({
        questionId: question.id,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        isCorrect: result.questionResults.find((item) => item.questionId === question.id)?.isCorrect ?? false,
      })),
      submittedAt,
    };

    const event: AssessmentScoredEvent = {
      name: 'assessment.scored',
      metadata: {
        eventId: `assessment-scored-${req.params.attemptId}`,
        timestamp: new Date().toISOString(),
        traceId: (req.headers['x-trace-id'] as string) || 'assessment-trace',
        userId,
      },
      payload: {
        userId,
        assessmentId: req.params.id,
        attemptId: req.params.attemptId,
        careerDomainId: assessment.careerDomainId ?? assessment.moduleId,
        assessmentType: assessment.type === 'TOPIC_QUIZ'
          ? SharedAssessmentType.QUIZ
          : SharedAssessmentType.MODULE_ASSESSMENT,
        score: result.percentage,
        percentage: result.percentage,
        totalMarks: result.totalMarks,
        correctAnswers: result.correctAnswers,
        incorrectAnswers: result.incorrectAnswers,
        unansweredQuestions: result.unansweredQuestions,
        skills: result.skillPerformance.map((skill) => ({
          skillId: skill.skillId,
          skillName: skill.skillName,
          questionsAttempted: skill.questionsAttempted,
          correctAnswers: skill.correctAnswers,
          incorrectAnswers: skill.incorrectAnswers,
          unansweredQuestions: skill.unansweredQuestions,
          score: skill.score,
          percentage: skill.percentage,
        })),
        topics: result.topicPerformance,
        scoredAt: new Date().toISOString(),
      },
    };
    await getEventBus().publish(event);

    res.json(formatSuccess({ result: payload }));
  } catch (err) {
    next(err);
  }
});

assessmentRouter.get('/:id', requireAuth(), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const assessment = await AssessmentModel.findOne({ _id: req.params.id, userId: req.user!.id }).lean();
    if (!assessment) return res.status(404).json({ error: { message: 'Assessment not found.' } });
    res.json(formatSuccess({ assessment: toPublicAssessment(assessment) }));
  } catch (err) {
    next(err);
  }
});

assessmentRouter.get('/attempts/me', requireAuth(), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const attempts = await AssessmentAttemptModel.find({ studentId: req.user!.id }).sort({ startedAt: -1 }).lean();
    res.json(formatSuccess({ attempts }));
  } catch (err) {
    next(err);
  }
});
