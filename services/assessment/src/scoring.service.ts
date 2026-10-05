import type { AssessmentQuestion, ScoredAttemptResult, SkillPerformanceSummary, TopicPerformanceSummary } from './types.js';

export interface ScoreAttemptInput {
  assessmentId: string;
  answers: Record<string, string | string[] | null | undefined> | Array<{ questionId: string; answer: string | string[] | null | undefined }>;
  questions: AssessmentQuestion[];
  attemptId?: string;
}

export class AssessmentScoringService {
  public scoreAttempt(input: ScoreAttemptInput): ScoredAttemptResult {
    const { assessmentId, answers, questions } = input;
    const normalizedQuestions = [...questions];
    const questionMap = new Map(normalizedQuestions.map((question) => [question.id, question]));
    const questionResults: ScoredAttemptResult['questionResults'] = [];
    const skillMap = new Map<string, SkillPerformanceSummary>();
    const topicMap = new Map<string, TopicPerformanceSummary>();

    if (!normalizedQuestions.length) {
      return {
        assessmentId,
        totalMarks: 0,
        obtainedMarks: 0,
        percentage: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        unansweredQuestions: 0,
        skillPerformance: [],
        topicPerformance: [],
        questionResults: [],
      };
    }

    const allAnswers = this.coerceAnswers(answers);

    for (const [questionId] of Object.entries(allAnswers)) {
      if (!questionMap.has(questionId)) {
        throw new Error(`Question ${questionId} was not found in assessment ${assessmentId}.`);
      }
    }

    let totalMarks = 0;
    let obtainedMarks = 0;
    let correctAnswers = 0;
    let incorrectAnswers = 0;
    let unansweredQuestions = 0;

    for (const question of normalizedQuestions) {
      totalMarks += question.marks ?? 0;
      const rawAnswer = allAnswers[question.id];
      const normalized = this.normalizeAnswer(rawAnswer);

      if (normalized === null || normalized === '') {
        unansweredQuestions += 1;
        questionResults.push({
          questionId: question.id,
          topicId: question.topicId,
          topicName: question.topicName ?? question.topicId,
          skillId: question.skillId,
          skillName: question.skillName ?? 'Unknown Skill',
          isCorrect: false,
          marksAwarded: 0,
          selectedAnswer: null,
        });

        const skillId = question.skillId;
        const skillName = question.skillName ?? 'Unknown Skill';
        const skillSummary = skillMap.get(skillId) ?? {
          skillId,
          skillName,
          questionsAttempted: 0,
          correctAnswers: 0,
          incorrectAnswers: 0,
          unansweredQuestions: 0,
          score: 0,
          percentage: 0,
        };
        skillSummary.unansweredQuestions += 1;
        skillMap.set(skillId, skillSummary);

        const topicId = question.topicId;
        const topicSummary = topicMap.get(topicId) ?? {
          topicId,
          topicName: question.topicName ?? topicId,
          questionsAttempted: 0,
          correctAnswers: 0,
          incorrectAnswers: 0,
          unansweredQuestions: 0,
          score: 0,
          percentage: 0,
        };
        topicSummary.unansweredQuestions += 1;
        topicMap.set(topicId, topicSummary);
        continue;
      }

      this.validateAnswer(question, rawAnswer);
      const isCorrect = this.isAnswerCorrect(question, rawAnswer);
      const marksAwarded = isCorrect ? question.marks ?? 0 : 0;

      if (isCorrect) {
        correctAnswers += 1;
        obtainedMarks += marksAwarded;
      } else {
        incorrectAnswers += 1;
      }

      questionResults.push({
        questionId: question.id,
        topicId: question.topicId,
        topicName: question.topicName ?? question.topicId,
        skillId: question.skillId,
        skillName: question.skillName ?? 'Unknown Skill',
        isCorrect,
        marksAwarded,
        selectedAnswer: rawAnswer ?? null,
      });

      const skillId = question.skillId;
      const skillName = question.skillName ?? 'Unknown Skill';
      const skillSummary = skillMap.get(skillId) ?? {
        skillId,
        skillName,
        questionsAttempted: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        unansweredQuestions: 0,
        score: 0,
        percentage: 0,
      };

      skillSummary.questionsAttempted += 1;
      if (isCorrect) {
        skillSummary.correctAnswers += 1;
      } else {
        skillSummary.incorrectAnswers += 1;
      }
      skillSummary.score += marksAwarded;
      skillMap.set(skillId, skillSummary);

      const topicId = question.topicId;
      const topicSummary = topicMap.get(topicId) ?? {
        topicId,
        topicName: question.topicName ?? topicId,
        questionsAttempted: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        unansweredQuestions: 0,
        score: 0,
        percentage: 0,
      };
      topicSummary.questionsAttempted += 1;
      if (isCorrect) {
        topicSummary.correctAnswers += 1;
      } else {
        topicSummary.incorrectAnswers += 1;
      }
      topicSummary.score += marksAwarded;
      topicMap.set(topicId, topicSummary);
    }

    const skillPerformance = Array.from(skillMap.values()).map((entry) => {
      const attempted = entry.questionsAttempted + entry.unansweredQuestions;
      const totalSkillMarks = normalizedQuestions
        .filter((question) => question.skillId === entry.skillId)
        .reduce((sum, question) => sum + (question.marks ?? 0), 0);
      const percentage = totalSkillMarks > 0 ? (entry.score / totalSkillMarks) * 100 : 0;

      return {
        ...entry,
        questionsAttempted: attempted,
        percentage: Number(percentage.toFixed(2)),
      };
    });

    const percentage = totalMarks > 0 ? Number(((obtainedMarks / totalMarks) * 100).toFixed(2)) : 0;
    const topicPerformance = Array.from(topicMap.values()).map((entry) => {
      const topicMarks = normalizedQuestions
        .filter((question) => question.topicId === entry.topicId)
        .reduce((sum, question) => sum + (question.marks ?? 0), 0);
      return {
        ...entry,
        questionsAttempted: entry.questionsAttempted + entry.unansweredQuestions,
        percentage: topicMarks > 0 ? Number(((entry.score / topicMarks) * 100).toFixed(2)) : 0,
      };
    });

    return {
      attemptId: input.attemptId,
      assessmentId,
      totalMarks,
      obtainedMarks,
      percentage,
      correctAnswers,
      incorrectAnswers,
      unansweredQuestions,
      skillPerformance,
      topicPerformance,
      questionResults,
    };
  }

  private coerceAnswers(
    answers: Record<string, string | string[] | null | undefined> | Array<{ questionId: string; answer: string | string[] | null | undefined }> | undefined,
  ): Record<string, string | string[] | null | undefined> {
    if (!answers) return {};

    if (Array.isArray(answers)) {
      const seen = new Set<string>();
      const map: Record<string, string | string[] | null | undefined> = {};

      for (const entry of answers) {
        if (!entry || typeof entry.questionId !== 'string') {
          throw new Error('Malformed answer payload: every answer entry must contain a questionId.');
        }
        if (seen.has(entry.questionId)) {
          throw new Error(`Duplicate question ID detected in submission: ${entry.questionId}`);
        }
        seen.add(entry.questionId);
        map[entry.questionId] = entry.answer;
      }

      return map;
    }

    return answers;
  }

  private normalizeAnswer(value: string | string[] | null | undefined): string | null {
    if (value === undefined || value === null) return null;
    if (Array.isArray(value)) {
      return value.map((item) => String(item).trim()).filter(Boolean).sort().join(',');
    }
    const text = String(value).trim();
    return text.length > 0 ? text : null;
  }

  private validateAnswer(question: AssessmentQuestion, rawAnswer: string | string[] | null | undefined): void {
    if (question.type === 'MCQ' || question.type === 'TRUE_FALSE') {
      const options = question.options ?? [];
      const normalized = this.normalizeAnswer(rawAnswer);
      if (!normalized) {
        return;
      }
      const selected = normalized;
      if (options.length > 0 && !options.some((option) => this.normalizeAnswer(option) === selected)) {
        throw new Error(`Invalid option for question ${question.id}.`);
      }
    }

    if (question.type === 'MULTIPLE_SELECT') {
      const normalized = Array.isArray(rawAnswer) ? rawAnswer : [String(rawAnswer ?? '')];
      const optionSet = new Set((question.options ?? []).map((option) => this.normalizeAnswer(option)));
      for (const option of normalized) {
        if (option === undefined || option === null || option === '') {
          continue;
        }
        const value = String(option).trim();
        if (!optionSet.has(value)) {
          throw new Error(`Invalid option for question ${question.id}.`);
        }
      }
    }
  }

  private isAnswerCorrect(question: AssessmentQuestion, rawAnswer: string | string[] | null | undefined): boolean {
    const expected = question.correctAnswer;
    if (typeof expected === 'string') {
      if (question.type === 'SHORT_ANSWER') {
        return this.normalizeAnswer(rawAnswer)?.toLowerCase() === expected.trim().toLowerCase();
      }
      return this.normalizeAnswer(rawAnswer)?.toLowerCase() === expected.trim().toLowerCase();
    }

    if (Array.isArray(expected)) {
      const normalizedSelected = this.normalizeAnswer(rawAnswer);
      const normalizedExpected = [...expected]
        .map((value) => String(value).trim())
        .filter(Boolean)
        .sort()
        .join(',');
      return normalizedSelected === normalizedExpected;
    }

    return false;
  }
}
