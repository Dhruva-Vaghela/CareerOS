import { describe, expect, it } from 'vitest';
import type { AssessmentQuestion } from './types.js';
import { AssessmentScoringService } from './scoring.service.js';

const questionBank: AssessmentQuestion[] = [
  {
    id: 'q1',
    assessmentId: 'a1',
    question: 'What is 2 + 2?',
    type: 'MCQ',
    options: ['3', '4', '5'],
    correctAnswer: '4',
    difficulty: 'EASY',
    marks: 10,
    skillId: 'skill-1',
    topicId: 'topic-1',
    order: 1,
  },
  {
    id: 'q2',
    assessmentId: 'a1',
    question: 'JavaScript is compiled.',
    type: 'TRUE_FALSE',
    options: ['True', 'False'],
    correctAnswer: 'False',
    difficulty: 'MEDIUM',
    marks: 10,
    skillId: 'skill-1',
    topicId: 'topic-1',
    order: 2,
  },
  {
    id: 'q3',
    assessmentId: 'a1',
    question: 'Name a database index type.',
    type: 'SHORT_ANSWER',
    correctAnswer: 'B-tree',
    difficulty: 'MEDIUM',
    marks: 10,
    skillId: 'skill-2',
    topicId: 'topic-2',
    order: 3,
  },
];

describe('AssessmentScoringService', () => {
  it('scores all correct answers deterministically', () => {
    const service = new AssessmentScoringService();
    const result = service.scoreAttempt({
      assessmentId: 'a1',
      answers: {
        q1: '4',
        q2: 'False',
        q3: 'B-tree',
      },
      questions: questionBank,
    });

    expect(result.totalMarks).toBe(30);
    expect(result.obtainedMarks).toBe(30);
    expect(result.correctAnswers).toBe(3);
    expect(result.incorrectAnswers).toBe(0);
    expect(result.unansweredQuestions).toBe(0);
    expect(result.percentage).toBe(100);
    expect(result.topicPerformance).toEqual([
      expect.objectContaining({ topicId: 'topic-1', questionsAttempted: 2, correctAnswers: 2, percentage: 100 }),
      expect.objectContaining({ topicId: 'topic-2', questionsAttempted: 1, correctAnswers: 1, percentage: 100 }),
    ]);
    expect(result.questionResults[0]).toMatchObject({ topicId: 'topic-1', skillId: 'skill-1', isCorrect: true });
  });

  it('handles partial and unanswered questions safely', () => {
    const service = new AssessmentScoringService();
    const result = service.scoreAttempt({
      assessmentId: 'a1',
      answers: {
        q1: '4',
        q2: '',
      },
      questions: questionBank,
    });

    expect(result.totalMarks).toBe(30);
    expect(result.obtainedMarks).toBe(10);
    expect(result.correctAnswers).toBe(1);
    expect(result.unansweredQuestions).toBe(2);
    expect(result.incorrectAnswers).toBe(0);
    expect(result.percentage).toBe(33.33);
    expect(result.topicPerformance).toEqual([
      expect.objectContaining({ topicId: 'topic-1', unansweredQuestions: 1, questionsAttempted: 2, percentage: 50 }),
      expect.objectContaining({ topicId: 'topic-2', unansweredQuestions: 1, questionsAttempted: 1, percentage: 0 }),
    ]);
  });

  it('rejects invalid options and duplicate question IDs in an answer list', () => {
    const service = new AssessmentScoringService();

    expect(() =>
      service.scoreAttempt({
        assessmentId: 'a1',
        answers: { q1: 'banana' },
        questions: questionBank,
      }),
    ).toThrow(/invalid option|answer/i);

    expect(() =>
      service.scoreAttempt({
        assessmentId: 'a1',
        answers: [
          { questionId: 'q1', answer: '4' },
          { questionId: 'q1', answer: '4' },
        ],
        questions: questionBank,
      }),
    ).toThrow(/duplicate.*question|question.*duplicate/i);
  });

  it('ensures questions from another assessment are rejected', () => {
    const service = new AssessmentScoringService();

    expect(() =>
      service.scoreAttempt({
        assessmentId: 'a1',
        answers: { q9: 'wrong' },
        questions: questionBank,
      }),
    ).toThrow(/not found|another assessment/i);
  });
});
