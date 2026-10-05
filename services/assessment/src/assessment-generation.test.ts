import { describe, expect, it } from 'vitest';
import { AssessmentGenerationService, getQuestionRoadmapContext, validateGeneratedQuestions, type GeneratedQuestion } from './assessment-generation.service.js';

const question = (stem: string): GeneratedQuestion => ({
  question: stem,
  options: ['A', 'B', 'C', 'D'],
  correctAnswer: 'A',
  explanation: 'A is correct because it follows from the stated conditions.',
});

describe('validateGeneratedQuestions', () => {
  it('can be constructed before AI provider credentials are needed', () => {
    expect(() => new AssessmentGenerationService()).not.toThrow();
  });

  it('accepts a complete question set with one valid answer per question', () => {
    const questions = [question('Scenario one'), question('Scenario two')];

    expect(validateGeneratedQuestions({ questions }, 2)).toEqual(questions);
  });

  it('rejects a question set with duplicate stems', () => {
    expect(() => validateGeneratedQuestions({ questions: [question('Repeat'), question(' Repeat ')] }, 2))
      .toThrow('duplicate questions');
  });

  it('rejects questions repeated from recent assessments', () => {
    expect(() => validateGeneratedQuestions({ questions: [question('Repeat')] }, 1, [' repeat ']))
      .toThrow('previous set');
  });

  it('rejects answers that are not one of the listed options', () => {
    expect(() => validateGeneratedQuestions({ questions: [{ ...question('Scenario'), correctAnswer: 'E' }] }, 1))
      .toThrow('correct answer that is not an option');
  });
});

describe('getQuestionRoadmapContext', () => {
  const roadmapTopics = [{
    id: 'topic-graph',
    title: 'Graph traversal',
    skillNames: ['Algorithms'],
    skillIds: ['skill-algorithms'],
  }];

  it('assigns stable roadmap topic and skill IDs without relying on AI labels', () => {
    expect(getQuestionRoadmapContext(0, roadmapTopics)).toEqual({
      topicId: 'topic-graph',
      topicName: 'Graph traversal',
      skillId: 'skill-algorithms',
      skillName: 'Algorithms',
    });
  });

  it('distributes questions across all roadmap topics and skills', () => {
    const contexts = [
      ...roadmapTopics,
      { id: 'topic-db', title: 'Databases', skillNames: ['SQL'], skillIds: ['skill-sql'] },
    ];

    expect(getQuestionRoadmapContext(0, contexts).topicId).toBe('topic-graph');
    expect(getQuestionRoadmapContext(1, contexts).topicId).toBe('topic-db');
    expect(getQuestionRoadmapContext(2, contexts).topicId).toBe('topic-graph');
  });
});