import { randomUUID } from 'node:crypto';
import { AIOrchestrator, ProviderFactory } from '@careeros/ai-client';
import { AssessmentModel } from './assessment.model.js';
import type { AssessmentGenerationInput, AssessmentQuestion } from './types.js';

export interface GeneratedQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

type TopicContext = NonNullable<AssessmentGenerationInput['topicContexts']>[number];

export function getQuestionRoadmapContext(index: number, topics: TopicContext[]) {
  const assignments = topics.flatMap((topic) => {
    const skillNames = topic.skillNames.length ? topic.skillNames : [topic.title];
    return skillNames.map((skillName, skillIndex) => ({
      topicId: topic.id,
      topicName: topic.title,
      skillId: topic.skillIds[skillIndex] ?? topic.id,
      skillName,
    }));
  });
  if (!assignments.length) throw new Error('Assessment generation requires at least one roadmap topic and skill.');
  return assignments[index % assignments.length];
}

interface AssessmentGenerationServiceOptions {
  orchestrator?: Pick<AIOrchestrator, 'execute'>;
  createId?: () => string;
}

const responseSchema = {
  type: 'object',
  required: ['questions'],
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        required: ['question', 'options', 'correctAnswer', 'explanation'],
        properties: {
          question: { type: 'string' },
          options: { type: 'array', items: { type: 'string' }, minItems: 4, maxItems: 4 },
          correctAnswer: { type: 'string' },
          explanation: { type: 'string' },
        },
      },
    },
  },
};

export function validateGeneratedQuestions(
  value: unknown,
  expectedCount: number,
  previousQuestionStems: string[] = [],
): GeneratedQuestion[] {
  if (!value || typeof value !== 'object' || !('questions' in value) || !Array.isArray(value.questions)) {
    throw new Error('Assessment generation returned an invalid question set.');
  }

  const rawQuestions = value.questions;
  if (rawQuestions.length !== expectedCount) throw new Error('Assessment generation returned the wrong number of questions.');
  const questions = rawQuestions.map((value): GeneratedQuestion => {
    if (!value || typeof value !== 'object') throw new Error('Assessment generation returned a malformed question.');
    const question = value as Record<string, unknown>;
    const correctAnswerValue = question.correctAnswer;
    if (
      typeof question.question !== 'string' ||
      !question.question.trim() ||
      !Array.isArray(question.options) ||
      question.options.length !== 4 ||
      !question.options.every((option) => typeof option === 'string' && option.trim()) ||
      typeof correctAnswerValue !== 'string' ||
      typeof question.explanation !== 'string' ||
      !question.explanation.trim()
    ) {
      throw new Error('Assessment generation returned a malformed question.');
    }

    const normalizedOptions = question.options.map((option) => option.trim().toLowerCase());
    if (new Set(normalizedOptions).size !== normalizedOptions.length) {
      throw new Error('Assessment generation returned duplicate answer options.');
    }
    const correctAnswer = question.options.find((option) => option.trim().toLowerCase() === correctAnswerValue.trim().toLowerCase());
    if (!correctAnswer) throw new Error('Assessment generation returned a correct answer that is not an option.');
    return {
      question: question.question.trim(),
      options: question.options.map((option) => option.trim()),
      correctAnswer: correctAnswer.trim(),
      explanation: question.explanation.trim(),
    };
  });

  const normalized = questions.map((question) => question.question.trim().toLowerCase());
  if (new Set(normalized).size !== normalized.length) throw new Error('Assessment generation returned duplicate questions.');
  const previous = new Set(previousQuestionStems.map((question) => question.trim().toLowerCase()));
  if (normalized.some((question) => previous.has(question))) {
    throw new Error('Assessment generation repeated a question from a previous set.');
  }
  return questions;
}

export class AssessmentGenerationService {
  private orchestrator: Pick<AIOrchestrator, 'execute'> | undefined;
  private readonly createId: () => string;

  constructor(options: AssessmentGenerationServiceOptions = {}) {
    this.orchestrator = options.orchestrator;
    this.createId = options.createId ?? randomUUID;
  }

  private getOrchestrator(): Pick<AIOrchestrator, 'execute'> {
    if (!this.orchestrator) {
      this.orchestrator = new AIOrchestrator(new ProviderFactory());
    }
    return this.orchestrator;
  }

  public async generate(input: AssessmentGenerationInput) {
    const totalQuestions = input.totalQuestions ?? 5;
    const topicContexts = input.topicContexts?.length ? input.topicContexts : [{
      id: input.topicId,
      title: input.topicTitle,
      description: input.topicDescription,
      skillNames: input.skillNames.length ? input.skillNames : [input.topicTitle],
      skillIds: input.skillIds ?? [],
    }];
    const previousAssessments = await AssessmentModel.find({
      userId: input.userId,
      roadmapId: input.roadmapId,
      topicId: input.topicId,
    }).sort({ createdAt: -1 }).limit(4).select('questions.question').lean();
    const previousQuestions = previousAssessments.flatMap((assessment) =>
      assessment.questions.map((question) => question.question),
    );

    const context = {
      careerGoal: { targetRole: input.targetRole },
      learning: {
        roadmapId: input.roadmapId,
        roadmapVersion: input.roadmapVersion,
        module: input.moduleTitle,
        topic: input.topicTitle,
        topicDescription: input.topicDescription ?? '',
        topicContexts,
      },
    };
    const prompt = [
      'Create a fresh, rigorous multiple-choice assessment using only the roadmap context below.',
      `Assessment type: ${input.type}. Difficulty: ${input.difficulty}. Number of questions: ${totalQuestions}.`,
      'Use applied, scenario-based, and misconception-testing questions. Make distractors plausible and technically close; avoid trivia, obvious answer patterns, and questions answerable without understanding the topic.',
      'Every question must be answerable from the provided topic descriptions. Provide exactly four distinct options, exactly one correct option, and a concise explanation that explains the reasoning.',
      'Use a mix of question framing and do not repeat these prior question stems for this student and topic:',
      JSON.stringify(previousQuestions),
      `Fresh-set nonce: ${this.createId()}`,
      'Roadmap context:',
      JSON.stringify(context),
      'Return JSON with a questions array. Each item must contain only question, options, correctAnswer, and explanation.',
    ].join('\n');

    const response = await this.getOrchestrator().execute<{ questions: GeneratedQuestion[] }>({
      requestId: this.createId(),
      task: 'ASSESSMENT_GENERATION',
      context,
      input: { content: prompt },
      options: {
        temperature: 0.8,
        topP: 0.95,
        maxOutputTokens: 4096,
        responseSchema,
      },
      metadata: { userId: input.userId },
      timestamp: new Date(),
    });

    if (!response.success || !response.data) {
      throw new Error('Question generation is unavailable. Please try again.');
    }

    const id = this.createId();
    const generatedQuestions = validateGeneratedQuestions(response.data, totalQuestions, previousQuestions);
    const questions: AssessmentQuestion[] = generatedQuestions.map((question, index) => ({
      id: this.createId(),
      assessmentId: id,
      question: question.question,
      type: 'MCQ',
      options: question.options,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      difficulty: input.difficulty ?? 'MEDIUM',
      marks: 10,
      ...getQuestionRoadmapContext(index, topicContexts),
      order: index + 1,
    }));

    return AssessmentModel.create({
      _id: id,
      title: `${input.type === 'TOPIC_QUIZ' ? 'Topic Quiz' : 'Module Assessment'}: ${input.topicTitle}`,
      description: `Generated for ${input.targetRole}, roadmap v${input.roadmapVersion}.`,
      userId: input.userId,
      roadmapId: input.roadmapId,
      roadmapVersion: input.roadmapVersion,
      moduleId: input.moduleId,
      moduleTitle: input.moduleTitle,
      topicId: input.topicId,
      topicTitle: input.topicTitle,
      type: input.type,
      difficulty: input.difficulty,
      duration: input.duration ?? 15,
      totalQuestions,
      totalMarks: totalQuestions * 10,
      status: 'ACTIVE',
      questions,
    });
  }
}