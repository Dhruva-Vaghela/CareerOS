import { randomUUID } from 'node:crypto';
import { NotFoundError, ValidationError } from '@careeros/errors';
import { createLogger } from '@careeros/logger';
import {
  InterviewMode,
  InterviewSessionStatus,
  InterviewCompletedEvent,
} from '@careeros/shared-types';
import {
  CompanyInterviewProfileModel,
  ICompanyInterviewProfileDoc,
} from '../db/models/companyInterviewProfile.model.js';
import { InterviewSessionModel, IInterviewSessionDoc } from '../db/models/interviewSession.model.js';
import { InterviewQuestionModel, IInterviewQuestionDoc } from '../db/models/interviewQuestion.model.js';
import { InterviewResponseModel, IInterviewResponseDoc } from '../db/models/interviewResponse.model.js';
import { InterviewFeedbackModel, IInterviewFeedbackDoc } from '../db/models/interviewFeedback.model.js';
import { CompanyAiGeneratorService } from './companyAiGenerator.service.js';
import { SarvamVoiceService } from './sarvamVoice.service.js';
import { DEFAULT_COMPANY_PROFILES, getGenericFallbackProfile } from './companyProfiles.data.js';
import { getEventBus } from '../bus.js';

const logger = createLogger('company-interview-service');

export interface StartInterviewInput {
  userId: string;
  companyName: string;
  jobRole: string;
  experienceLevel: string;
  roundType: string;
  companyProfileId?: string;
  questionsCount?: number;
}

export interface SubmitResponseInput {
  sessionId: string;
  questionId: string;
  userId: string;
  responseText?: string;
  audioBuffer?: Buffer;
  audioFilename?: string;
}

export class CompanyInterviewService {
  constructor(
    private readonly aiGenerator: CompanyAiGeneratorService = new CompanyAiGeneratorService(),
    private readonly voiceService: SarvamVoiceService = new SarvamVoiceService(),
  ) {}

  /**
   * Seed and list available company interview profiles / presets.
   */
  public async listProfiles(): Promise<ICompanyInterviewProfileDoc[]> {
    const count = await CompanyInterviewProfileModel.countDocuments();
    if (count === 0) {
      logger.info('Seeding default company interview profiles...');
      await CompanyInterviewProfileModel.insertMany(DEFAULT_COMPANY_PROFILES);
    }
    return CompanyInterviewProfileModel.find().sort({ companyName: 1, jobRole: 1 });
  }

  public async getProfileById(id: string): Promise<ICompanyInterviewProfileDoc | null> {
    return CompanyInterviewProfileModel.findById(id);
  }

  /**
   * Starts a realistic Company Mode interview simulation.
   * INVARIANT: No Digital Twin context is retrieved or injected.
   */
  public async startInterview(input: StartInterviewInput): Promise<{
    session: IInterviewSessionDoc;
    firstQuestion: IInterviewQuestionDoc;
    totalQuestions: number;
    audioBase64?: string;
  }> {
    const { userId, companyName, jobRole, experienceLevel, roundType, companyProfileId, questionsCount = 4 } = input;

    if (!companyName || !jobRole || !experienceLevel || !roundType) {
      throw new ValidationError('Company name, job role, experience level, and round type are required');
    }

    // 1. Look up profile or construct generic fallback
    let profile: ICompanyInterviewProfileDoc | null = null;
    if (companyProfileId) {
      profile = await CompanyInterviewProfileModel.findById(companyProfileId);
    }
    if (!profile) {
      profile = await CompanyInterviewProfileModel.findOne({
        companyName: new RegExp(`^${companyName}$`, 'i'),
        jobRole: new RegExp(`^${jobRole}$`, 'i'),
        roundType,
      });
    }

    const patternNotes = profile
      ? profile.referencePatternNotes
      : getGenericFallbackProfile(companyName, jobRole, experienceLevel, roundType).referencePatternNotes;

    // 2. Generate questions strictly from Company/Role/Round inputs (NO Twin call!)
    const generated = await this.aiGenerator.generateQuestions({
      companyName,
      jobRole,
      experienceLevel,
      roundType,
      patternNotes,
      questionsCount,
    });

    // 3. Create Session Record
    const session = await InterviewSessionModel.create({
      userId,
      mode: InterviewMode.COMPANY,
      status: InterviewSessionStatus.IN_PROGRESS,
      companyProfileId: profile?._id?.toString(),
      companyName,
      jobRole,
      experienceLevel,
      roundType,
      currentQuestionIndex: 0,
      totalQuestions: generated.questions.length,
      startedAt: new Date(),
    });

    // 4. Save Question Records
    const createdQuestions: IInterviewQuestionDoc[] = [];
    for (let i = 0; i < generated.questions.length; i++) {
      const q = generated.questions[i];
      const createdQ = await InterviewQuestionModel.create({
        sessionId: session._id.toString(),
        order: i,
        questionText: q.questionText,
        category: q.category,
        difficulty: q.difficulty,
        rubricCriteria: q.rubricCriteria,
      });
      createdQuestions.push(createdQ);
    }

    const firstQuestion = createdQuestions[0];

    // 5. Optionally synthesize speech for first question via Sarvam Voice
    let audioBase64: string | undefined;
    if (this.voiceService.isAvailable()) {
      try {
        const synth = await this.voiceService.synthesizeSpeech(firstQuestion.questionText);
        if (synth.audioBase64) {
          audioBase64 = synth.audioBase64;
        }
      } catch (err) {
        logger.warn({ err }, 'Could not synthesize TTS for initial question');
      }
    }

    return {
      session,
      firstQuestion,
      totalQuestions: createdQuestions.length,
      audioBase64,
    };
  }

  /**
   * Retrieves full interview session state, including all questions and completed answers.
   */
  public async getSessionState(
    sessionId: string,
    userId: string,
  ): Promise<{
    session: IInterviewSessionDoc;
    questions: IInterviewQuestionDoc[];
    responses: IInterviewResponseDoc[];
    feedback: IInterviewFeedbackDoc | null;
    currentQuestion: IInterviewQuestionDoc | null;
  }> {
    const session = await InterviewSessionModel.findById(sessionId);
    if (!session) {
      throw new NotFoundError('Interview session not found');
    }
    if (session.userId !== userId) {
      throw new ValidationError('Unauthorized access to interview session');
    }

    const questions = await InterviewQuestionModel.find({ sessionId }).sort({ order: 1 });
    const responses = await InterviewResponseModel.find({ sessionId });
    const feedback = await InterviewFeedbackModel.findOne({ sessionId });

    const currentQuestion =
      session.status === InterviewSessionStatus.IN_PROGRESS &&
      session.currentQuestionIndex < questions.length
        ? questions[session.currentQuestionIndex]
        : null;

    return {
      session,
      questions,
      responses,
      feedback,
      currentQuestion,
    };
  }

  /**
   * Submits candidate response to current question, evaluates it, and advances turn.
   */
  public async submitResponse(input: SubmitResponseInput): Promise<{
    evaluation: IInterviewResponseDoc['evaluation'];
    nextQuestion: IInterviewQuestionDoc | null;
    isFinished: boolean;
    feedback: IInterviewFeedbackDoc | null;
    nextAudioBase64?: string;
    transcript?: string;
  }> {
    const { sessionId, questionId, userId, audioBuffer, audioFilename } = input;
    let responseText = (input.responseText || '').trim();

    const session = await InterviewSessionModel.findById(sessionId);
    if (!session) {
      throw new NotFoundError('Interview session not found');
    }
    if (session.userId !== userId) {
      throw new ValidationError('Unauthorized access to interview session');
    }
    if (session.status === InterviewSessionStatus.COMPLETED) {
      throw new ValidationError('Interview session has already been completed');
    }

    const question = await InterviewQuestionModel.findById(questionId);
    if (!question || question.sessionId !== sessionId) {
      throw new NotFoundError('Question not found for this session');
    }

    // 1. If voice audio provided, transcribe using Sarvam AI
    let transcript: string | undefined;
    if (audioBuffer && audioBuffer.length > 0) {
      const sttResult = await this.voiceService.transcribeAudio(
        audioBuffer,
        audioFilename || 'candidate-response.webm',
      );
      transcript = sttResult.transcript;
      if (!responseText) {
        responseText = transcript;
      }
    }

    if (!responseText) {
      throw new ValidationError('Response text or spoken audio is required');
    }

    // 2. Evaluate answer against company standard
    const evaluation = await this.aiGenerator.evaluateResponse({
      companyName: session.companyName || 'Tech Company',
      jobRole: session.jobRole || 'Software Engineer',
      roundType: session.roundType || 'Technical Screen',
      questionText: question.questionText,
      rubricCriteria: question.rubricCriteria,
      candidateResponse: responseText,
    });

    // 3. Save InterviewResponse
    const responseDoc = await InterviewResponseModel.findOneAndUpdate(
      { sessionId, questionId },
      {
        userId,
        responseTextOrAudioRef: responseText,
        transcript: transcript || responseText,
        evaluation,
      },
      { upsert: true, new: true },
    );

    // 4. Advance question index
    const nextIndex = session.currentQuestionIndex + 1;
    session.currentQuestionIndex = nextIndex;

    const allQuestions = await InterviewQuestionModel.find({ sessionId }).sort({ order: 1 });
    const isFinished = nextIndex >= allQuestions.length;

    let nextQuestion: IInterviewQuestionDoc | null = null;
    let nextAudioBase64: string | undefined;
    let feedbackDoc: IInterviewFeedbackDoc | null = null;

    if (isFinished) {
      // 5. Finalize Session: Compute final feedback and publish event
      session.status = InterviewSessionStatus.COMPLETED;
      session.endedAt = new Date();

      // Collect all Q&A pairs with rubric and evaluation details
      const allResponses = await InterviewResponseModel.find({ sessionId });
      const qaPairs = allQuestions.map((q) => {
        const resp = allResponses.find((r) => r.questionId === q._id.toString());
        return {
          questionId: q._id.toString(),
          question: q.questionText,
          category: q.category,
          difficulty: q.difficulty,
          rubricCriteria: q.rubricCriteria,
          response: resp?.responseTextOrAudioRef || '',
          score: resp?.evaluation?.score || 70,
          feedback: resp?.evaluation?.feedback || '',
          strengths: resp?.evaluation?.strengths || [],
          improvements: resp?.evaluation?.improvements || [],
          technicalAccuracy: resp?.evaluation?.technicalAccuracy,
          communicationClarity: resp?.evaluation?.communicationClarity,
        };
      });

      const finalReport = await this.aiGenerator.generateFinalFeedback({
        companyName: session.companyName || 'Tech Company',
        jobRole: session.jobRole || 'Software Engineer',
        experienceLevel: session.experienceLevel || 'Intermediate',
        roundType: session.roundType || 'Technical Screen',
        qaPairs,
      });

      session.overallScore = finalReport.overallScore;
      await session.save();

      feedbackDoc = await InterviewFeedbackModel.findOneAndUpdate(
        { sessionId },
        {
          userId,
          summary: finalReport.summary,
          overallScore: finalReport.overallScore,
          hiringDecision: finalReport.hiringDecision,
          strengths: finalReport.strengths,
          weakAreas: finalReport.weakAreas,
          recommendations: finalReport.recommendations,
          categoryBreakdown: finalReport.categoryBreakdown,
          questionsFeedback: finalReport.questionsFeedback,
        },
        { upsert: true, new: true },
      );

      // 6. Publish interview.completed event (Post-interview ONLY writeback)
      try {
        const bus = getEventBus();
        const completedEvent: InterviewCompletedEvent = {
          name: 'interview.completed',
          metadata: {
            eventId: randomUUID(),
            timestamp: new Date().toISOString(),
            traceId: randomUUID(),
            userId,
          },
          payload: {
            userId,
            sessionId,
            mode: InterviewMode.COMPANY,
            score: finalReport.overallScore,
          },
        };
        await bus.publish(completedEvent);
        logger.info({ sessionId, score: finalReport.overallScore }, 'Published interview.completed event');
      } catch (err) {
        logger.error({ err }, 'Error publishing interview.completed event');
      }
    } else {
      await session.save();
      nextQuestion = allQuestions[nextIndex];

      // Synthesize TTS audio for next question
      if (this.voiceService.isAvailable() && nextQuestion) {
        try {
          const synth = await this.voiceService.synthesizeSpeech(nextQuestion.questionText);
          if (synth.audioBase64) {
            nextAudioBase64 = synth.audioBase64;
          }
        } catch (err) {
          logger.warn({ err }, 'Could not synthesize TTS for next question');
        }
      }
    }

    return {
      evaluation: responseDoc.evaluation,
      nextQuestion,
      isFinished,
      feedback: feedbackDoc,
      nextAudioBase64,
      transcript,
    };
  }

  /**
   * Retrieves feedback for a completed interview session.
   */
  public async getFeedback(sessionId: string, userId: string): Promise<IInterviewFeedbackDoc> {
    const session = await InterviewSessionModel.findById(sessionId);
    if (!session) {
      throw new NotFoundError('Interview session not found');
    }
    if (session.userId !== userId) {
      throw new ValidationError('Unauthorized access to interview session');
    }

    const feedback = await InterviewFeedbackModel.findOne({ sessionId });
    if (!feedback) {
      throw new NotFoundError('Feedback not generated yet for this session');
    }
    return feedback;
  }

  /**
   * Lists interview history for a user.
   */
  public async listUserHistory(userId: string): Promise<Array<{
    session: IInterviewSessionDoc;
    feedback: IInterviewFeedbackDoc | null;
  }>> {
    const sessions = await InterviewSessionModel.find({ userId }).sort({ createdAt: -1 });
    const results = [];
    for (const session of sessions) {
      const feedback = await InterviewFeedbackModel.findOne({ sessionId: session._id.toString() });
      results.push({
        session,
        feedback,
      });
    }
    return results;
  }
}
