export type AssessmentType = 'TOPIC_QUIZ' | 'MODULE_ASSESSMENT';
export type AssessmentDifficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type QuestionType = 'MCQ' | 'MULTIPLE_SELECT' | 'TRUE_FALSE' | 'SHORT_ANSWER';
export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'ABANDONED';

export interface AssessmentQuestion {
  id: string;
  assessmentId: string;
  question: string;
  type: QuestionType;
  options?: string[];
  correctAnswer?: string | string[];
  explanation?: string;
  difficulty: AssessmentDifficulty;
  marks: number;
  skillId: string;
  skillName?: string;
  topicId: string;
  topicName?: string;
  metadata?: Record<string, unknown>;
  order: number;
}

export interface Assessment {
  id: string;
  title: string;
  description: string;
  userId?: string;
  careerDomainId?: string;
  domainName?: string;
  roadmapId?: string;
  roadmapVersion?: number;
  moduleId?: string;
  moduleTitle?: string;
  topicId?: string;
  topicTitle?: string;
  type: AssessmentType;
  difficulty: AssessmentDifficulty;
  duration: number;
  totalQuestions: number;
  totalMarks: number;
  passingScore?: number;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  createdAt: Date;
  updatedAt: Date;
  questions: AssessmentQuestion[];
}

export interface AssessmentAttempt {
  id: string;
  assessmentId: string;
  studentId: string;
  startedAt: Date;
  submittedAt?: Date;
  status: AttemptStatus;
  score?: number;
  percentage?: number;
  totalMarks?: number;
  obtainedMarks?: number;
  correctAnswers?: number;
  incorrectAnswers?: number;
  unansweredQuestions?: number;
  duration?: number;
  attemptNumber: number;
  metadata?: Record<string, unknown>;
}

export interface AttemptAnswer {
  id: string;
  attemptId: string;
  questionId: string;
  selectedAnswer: string | string[] | null;
  isCorrect?: boolean;
  marksAwarded?: number;
  answeredAt: Date;
}

export interface SkillPerformanceSummary {
  skillId: string;
  skillName: string;
  questionsAttempted: number;
  correctAnswers: number;
  incorrectAnswers: number;
  unansweredQuestions: number;
  score: number;
  answers?: Record<string, string | string[] | null>;
  questionResults?: QuestionResult[];
  topicPerformance?: TopicPerformanceSummary[];
  skillPerformance?: SkillPerformanceSummary[];
  percentage: number;
}

export interface QuestionResult {
  questionId: string;
  topicId: string;
  topicName: string;
  skillId: string;
  skillName: string;
  isCorrect: boolean;
  marksAwarded: number;
  selectedAnswer: string | string[] | null;
}

export interface TopicPerformanceSummary {
  topicId: string;
  topicName: string;
  questionsAttempted: number;
  correctAnswers: number;
  incorrectAnswers: number;
  unansweredQuestions: number;
  score: number;
  percentage: number;
}

export interface ScoredAttemptResult {
  attemptId?: string;
  assessmentId: string;
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  correctAnswers: number;
  incorrectAnswers: number;
  unansweredQuestions: number;
  skillPerformance: SkillPerformanceSummary[];
  topicPerformance: TopicPerformanceSummary[];
  questionResults: QuestionResult[];
}

export interface AssessmentGenerationInput {
  userId: string;
  careerDomainId?: string;
  domainName?: string;
  targetRole: string;
  roadmapId: string;
  roadmapVersion: number;
  moduleId: string;
  moduleTitle: string;
  topicId: string;
  topicTitle: string;
  topicDescription?: string;
  skillNames: string[];
  skillIds?: string[];
  topicContexts?: Array<{
    id: string;
    title: string;
    description?: string;
    skillNames: string[];
    skillIds: string[];
    topicContexts?: Array<{
      id: string;
      title: string;
      description?: string;
      skillNames: string[];
      skillIds: string[];
    }>;
  }>;
  skills?: Array<{ id: string; name: string; topics?: Array<{ id: string; name: string }> }>;
  type: AssessmentType;
  difficulty?: AssessmentDifficulty;
  duration?: number;
  totalQuestions?: number;
}

export interface AssessmentSubmissionPayload {
  assessmentId: string;
  answers: Record<string, string | string[] | null | undefined> | Array<{ questionId: string; answer: string | string[] | null | undefined }>;
  attemptId?: string;
}
