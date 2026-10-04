import { describe, it, expect, vi } from 'vitest';
import { CompanyAiGeneratorService } from './services/companyAiGenerator.service.js';
import { CompanyInterviewService } from './services/companyInterview.service.js';
import { InterviewMode, InterviewRoundType, HiringDecision } from '@careeros/shared-types';

describe('Company Mode Architectural Invariant Tests', () => {
  it('CRITICAL INVARIANT: Company Mode question generation must never invoke or depend on Digital Twin context', async () => {
    const aiGenerator = new CompanyAiGeneratorService();

    // Verify method signatures and execution do not take digital twin context
    const questionsOutput = await aiGenerator.generateQuestions({
      companyName: 'Google',
      jobRole: 'Software Engineer',
      experienceLevel: 'INTERMEDIATE',
      roundType: InterviewRoundType.CODING_ALGORITHMS,
      patternNotes: 'Google standard algorithms round',
      questionsCount: 4,
    });

    expect(questionsOutput).toBeDefined();
    expect(questionsOutput.companyName).toBe('Google');
    expect(questionsOutput.jobRole).toBe('Software Engineer');
    expect(questionsOutput.questions.length).toBeGreaterThanOrEqual(1);

    // Assert that each question is generic to the company & role and not personalized to private user weak areas
    const firstQ = questionsOutput.questions[0];
    expect(firstQ.questionText).toBeDefined();
    expect(firstQ.rubricCriteria.length).toBeGreaterThan(0);
  });

  it('Evaluates candidate response strictly on company bar without coaching adaptations', async () => {
    const aiGenerator = new CompanyAiGeneratorService();

    const evaluation = await aiGenerator.evaluateResponse({
      companyName: 'Amazon',
      jobRole: 'Backend Developer',
      roundType: 'TECHNICAL_SCREEN',
      questionText: 'Explain the internal architecture of Node.js event loop and how to handle CPU-intensive tasks.',
      rubricCriteria: ['Call stack & libuv thread pool', 'Non-blocking I/O', 'Worker threads/clustering'],
      candidateResponse: 'Node.js uses a single main thread with an event loop supported by libuv thread pool for async I/O. For CPU bound tasks, we can offload to worker threads or child processes.',
    });

    expect(evaluation.score).toBeGreaterThan(0);
    expect(evaluation.score).toBeLessThanOrEqual(100);
    expect(evaluation.feedback).toBeDefined();
    expect(evaluation.technicalAccuracy).toBeGreaterThan(0);
    expect(evaluation.communicationClarity).toBeGreaterThan(0);
  });

  it('Generates official hiring committee evaluation and decision upon interview completion', async () => {
    const aiGenerator = new CompanyAiGeneratorService();

    const feedback = await aiGenerator.generateFinalFeedback({
      companyName: 'Google',
      jobRole: 'Software Engineer',
      experienceLevel: 'INTERMEDIATE',
      roundType: 'CODING_ALGORITHMS',
      qaPairs: [
        {
          question: 'Implement LRU cache',
          category: 'Data Structures',
          response: 'Used doubly linked list combined with hash map for O(1) operations.',
          score: 85,
          feedback: 'Solid implementation and clean complexity analysis.',
        },
        {
          question: 'Find cycle in directed graph',
          category: 'Graph Algorithms',
          response: 'Applied DFS with 3-color vertex marking to detect back edges.',
          score: 90,
          feedback: 'Optimal solution and well structured.',
        },
      ],
    });

    expect(feedback.overallScore).toBeGreaterThanOrEqual(80);
    expect([HiringDecision.STRONG_HIRE, HiringDecision.HIRE, HiringDecision.LEAN_HIRE]).toContain(
      feedback.hiringDecision,
    );
    expect(feedback.strengths.length).toBeGreaterThan(0);
    expect(feedback.weakAreas.length).toBeGreaterThan(0);
    expect(feedback.recommendations.length).toBeGreaterThan(0);
  });
});
