import type { AssessmentQuestion } from './types.js';

export function toPublicAssessment<T extends { questions: AssessmentQuestion[] }>(assessment: T) {
  const { questions, ...details } = assessment;
  return {
    ...details,
    questions: questions.map(({ correctAnswer: _answer, explanation: _explanation, ...question }) => question),
  };
}