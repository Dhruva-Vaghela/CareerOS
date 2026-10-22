import { ValidationError } from '@careeros/errors';
import type { ContextSourceKey } from './context-contracts.js';
import type { AIModelAlias } from './contracts.js';

export const AI_TASK_IDS = [
  'ROADMAP_GENERATION',
  'ASSESSMENT_GENERATION',
  'CAREER_CHATBOT',
  'MOCK_INTERVIEW',
  'PROJECT_REVIEW',
  'RESUME_ANALYSIS',
  'RECOMMENDATION_ENGINE',
] as const;

export type AITaskId = (typeof AI_TASK_IDS)[number];

export interface RetryStrategyMetadata {
  name: 'NO_RETRY';
  maxAttempts: 1;
}

export interface AITaskDefinition {
  id: AITaskId;
  description: string;
  modelAlias: AIModelAlias;
  promptTemplateName: string;
  requiredContext: readonly ContextSourceKey[];
  digitalTwinPartitions?: readonly string[];
  responseSchema: Record<string, unknown>;
  retryStrategy: RetryStrategyMetadata;
}

const PLACEHOLDER_RESPONSE_SCHEMA = { type: 'object' } as const;
const RESUME_ANALYSIS_RESPONSE_SCHEMA = {
  type: 'object',
  required: ['summary', 'strengths', 'weaknesses', 'suggestions', 'recruiterFeedback'],
  properties: {
    summary: { type: 'string' },
    strengths: { type: 'array', items: { type: 'object', required: ['title', 'evidence', 'whyItMatters'] } },
    weaknesses: { type: 'array', items: { type: 'object', required: ['title', 'evidence', 'whyItMatters'] } },
    suggestions: { type: 'array', items: { type: 'object', required: ['priority', 'issue', 'action', 'exampleRewrite'] } },
    recruiterFeedback: { type: 'object', required: ['firstImpression', 'concerns', 'recommendation'] },
  },
} as const;
const NO_RETRY: RetryStrategyMetadata = { name: 'NO_RETRY', maxAttempts: 1 };

const TASK_DEFINITIONS: readonly AITaskDefinition[] = [
  {
    id: 'ROADMAP_GENERATION',
    description: 'Generate a personalized learning roadmap.',
    modelAlias: 'REASONING_MODEL',
    promptTemplateName: 'roadmap-generation',
    requiredContext: ['profile', 'careerGoal', 'digitalTwin'],
    digitalTwinPartitions: ['skillState', 'evidenceState'],
    responseSchema: PLACEHOLDER_RESPONSE_SCHEMA,
    retryStrategy: NO_RETRY,
  },
  {
    id: 'ASSESSMENT_GENERATION',
    description: 'Generate roadmap-grounded quiz and module assessment questions.',
    modelAlias: 'REASONING_MODEL',
    promptTemplateName: 'assessment-generation',
    requiredContext: ['careerGoal', 'learning'],
    responseSchema: PLACEHOLDER_RESPONSE_SCHEMA,
    retryStrategy: NO_RETRY,
  },
  {
    id: 'CAREER_CHATBOT',
    description: 'Provide grounded conversational career guidance.',
    modelAlias: 'FAST_MODEL',
    promptTemplateName: 'career-chatbot',
    requiredContext: ['careerGoal', 'learning', 'projects', 'assessment', 'interview'],
    responseSchema: PLACEHOLDER_RESPONSE_SCHEMA,
    retryStrategy: NO_RETRY,
  },
  {
    id: 'MOCK_INTERVIEW',
    description: 'Generate or evaluate a mock interview interaction.',
    modelAlias: 'REASONING_MODEL',
    promptTemplateName: 'mock-interview',
    requiredContext: ['interview'],
    responseSchema: PLACEHOLDER_RESPONSE_SCHEMA,
    retryStrategy: NO_RETRY,
  },
  {
    id: 'PROJECT_REVIEW',
    description: 'Review a user project submission.',
    modelAlias: 'REASONING_MODEL',
    promptTemplateName: 'project-review',
    requiredContext: ['projects'],
    responseSchema: PLACEHOLDER_RESPONSE_SCHEMA,
    retryStrategy: NO_RETRY,
  },
  {
    id: 'RESUME_ANALYSIS',
    description: 'Analyze a resume and produce evidence-based improvement and recruiter feedback.',
    modelAlias: 'DEFAULT_MODEL',
    promptTemplateName: 'resume-analysis',
    requiredContext: ['resume', 'careerGoal'],
    responseSchema: RESUME_ANALYSIS_RESPONSE_SCHEMA,
    retryStrategy: NO_RETRY,
  },
  {
    id: 'RECOMMENDATION_ENGINE',
    description: 'Generate prioritized next-step recommendations.',
    modelAlias: 'REASONING_MODEL',
    promptTemplateName: 'recommendation-engine',
    requiredContext: ['careerGoal', 'digitalTwin'],
    digitalTwinPartitions: ['readinessState', 'evidenceState', 'skillState', 'recommendations'],
    responseSchema: PLACEHOLDER_RESPONSE_SCHEMA,
    retryStrategy: NO_RETRY,
  },
];

export class TaskRegistry {
  private readonly tasks: ReadonlyMap<AITaskId, AITaskDefinition>;

  constructor(tasks: readonly AITaskDefinition[] = TASK_DEFINITIONS) {
    this.tasks = new Map(tasks.map((task) => [task.id, task]));
  }

  public get(taskId: string): AITaskDefinition {
    const task = this.tasks.get(taskId as AITaskId);
    if (!task) throw new ValidationError(`AI task "${taskId}" is not registered.`);
    return task;
  }

  public list(): readonly AITaskDefinition[] {
    return [...this.tasks.values()];
  }
}
