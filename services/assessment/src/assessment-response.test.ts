import { describe, expect, it } from 'vitest';
import { toPublicAssessment } from './assessment.response.js';

describe('toPublicAssessment', () => {
  it('removes answer keys and explanations before an attempt is submitted', () => {
    const result = toPublicAssessment({
      id: 'assessment-1',
      questions: [{
        id: 'question-1',
        assessmentId: 'assessment-1',
        question: 'Which option is valid?',
        type: 'MCQ' as const,
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 'B',
        explanation: 'B is the only option that meets the requirement.',
        difficulty: 'HARD' as const,
        marks: 10,
        skillId: 'algorithms',
        skillName: 'Algorithms',
        topicId: 'graph-search',
        topicName: 'Graph search',
        order: 1,
      }],
    });

    expect(result.id).toBe('assessment-1');
    expect(result.questions[0]).not.toHaveProperty('correctAnswer');
    expect(result.questions[0]).not.toHaveProperty('explanation');
    expect(result.questions[0].options).toEqual(['A', 'B', 'C', 'D']);
  });
});