import { describe, expect, it } from 'vitest';
import {
  getAttemptSkillScores,
  getAttemptStatusCounts,
  canRenderRadarChart,
  getRadarAxisLabel,
  getRadarChartSkills,
  getScorePointAccessibleLabel,
  getScorePointDateLabels,
  getScoreHistoryGroups,
  getSkillImprovements,
  getSkillTrackingAttemptNumbers,
} from './SkillTrackingView';

const metadata = {
  roadmapId: 'roadmap-1',
  roadmapVersion: 2,
  moduleId: 'module-1',
  topicId: 'topic-1',
  type: 'TOPIC_QUIZ',
};

function attempt(overrides: Record<string, unknown> = {}) {
  return {
    _id: 'submission-1',
    assessmentId: 'assessment-1',
    status: 'SUBMITTED',
    startedAt: '2026-01-01T10:00:00.000Z',
    attemptNumber: 1,
    ...overrides,
  };
}

describe('Skill Tracking attempt numbering', () => {
  it('sequences attempts across regenerated assessment records', () => {
    const attempts = [
      attempt({ _id: 'submission-2', assessmentId: 'assessment-new', startedAt: '2026-01-02T10:00:00Z' }),
      attempt(),
    ];
    const numbers = getSkillTrackingAttemptNumbers(attempts, {
      'assessment-1': metadata,
      'assessment-new': metadata,
    });

    expect(numbers.get('submission-1')).toBe(1);
    expect(numbers.get('submission-2')).toBe(2);
  });

  it('keeps numbering independent for distinct quiz identities', () => {
    const attempts = [
      attempt({ _id: 'one', assessmentId: 'assessment-1' }),
      attempt({ _id: 'two', assessmentId: 'assessment-2', startedAt: '2026-01-02T10:00:00Z' }),
    ];
    const numbers = getSkillTrackingAttemptNumbers(attempts, {
      'assessment-1': metadata,
      'assessment-2': { ...metadata, topicId: 'topic-2' },
    });

    expect(numbers.get('one')).toBe(1);
    expect(numbers.get('two')).toBe(1);
  });

  it('preserves backend numbering when any identity field is missing', () => {
    const fields = ['roadmapId', 'roadmapVersion', 'moduleId', 'topicId', 'type'] as const;
    for (const field of fields) {
      const numbers = getSkillTrackingAttemptNumbers([
        attempt({ _id: `unresolved-${field}`, attemptNumber: 4 }),
      ], { 'assessment-1': { ...metadata, [field]: undefined } });
      expect(numbers.get(`unresolved-${field}`)).toBe(4);
    }
  });

  it('uses deterministic ordering for equal timestamps and ignores input order', () => {
    const attempts = [
      attempt({ _id: 'later-id', assessmentId: 'assessment-b' }),
      attempt({ _id: 'earlier-id', assessmentId: 'assessment-a' }),
    ];
    const catalog = { 'assessment-a': metadata, 'assessment-b': metadata };
    const forward = getSkillTrackingAttemptNumbers(attempts, catalog);
    const reversed = getSkillTrackingAttemptNumbers([...attempts].reverse(), catalog);

    expect(forward.get('earlier-id')).toBe(1);
    expect(forward.get('later-id')).toBe(2);
    expect(reversed).toEqual(forward);
  });

  it('includes unfinished attempts in the sequence', () => {
    const numbers = getSkillTrackingAttemptNumbers([
      attempt({ _id: 'unfinished', status: 'IN_PROGRESS', startedAt: '2026-01-02T10:00:00Z' }),
      attempt({ _id: 'submitted', startedAt: '2026-01-01T10:00:00Z' }),
    ], { 'assessment-1': metadata });

    expect(numbers.get('submitted')).toBe(1);
    expect(numbers.get('unfinished')).toBe(2);
  });

  it('keeps display numbers stable when the history is presented as a filtered subset', () => {
    const attempts = [
      attempt({ _id: 'first', startedAt: '2026-01-01T10:00:00Z' }),
      attempt({ _id: 'second', assessmentId: 'assessment-2', startedAt: '2026-01-02T10:00:00Z' }),
      attempt({ _id: 'third', assessmentId: 'assessment-3', startedAt: '2026-01-03T10:00:00Z' }),
    ];
    const catalog = {
      'assessment-1': metadata,
      'assessment-2': metadata,
      'assessment-3': metadata,
    };
    const completeHistoryNumbers = getSkillTrackingAttemptNumbers(attempts, catalog);
    const filteredPresentation = attempts.filter((item) => item._id !== 'second').reverse();

    expect(filteredPresentation.map((item) => completeHistoryNumbers.get(item._id))).toEqual([3, 1]);
  });

  it('preserves a number when a complete identity has no reliable timestamp', () => {
    const numbers = getSkillTrackingAttemptNumbers([
      attempt({ _id: 'no-date', startedAt: 'invalid-date', attemptNumber: 3 }),
    ], { 'assessment-1': metadata });

    expect(numbers.get('no-date')).toBe(3);
  });
});

describe('Skill Tracking chart inputs', () => {
  it('distinguishes repeated score dates with attempt labels and accessible point details', () => {
    const point = {
      attemptId: 'attempt-2',
      assessmentId: 'assessment-1',
      title: 'Algorithms quiz',
      attemptNumber: 2,
      score: 78,
      submittedAt: '2026-04-02T10:30:00Z',
    };

    expect(getScorePointDateLabels(point).detail).toBe('Attempt 2');
    expect(getScorePointAccessibleLabel(point)).toContain('attempt 2');
    expect(getScorePointAccessibleLabel(point)).toContain('78 percent');
    expect(getScorePointAccessibleLabel(point)).toContain('Algorithms quiz');
  });

  it('keeps long radar axis labels compact while preserving short labels', () => {
    expect(getRadarAxisLabel('Algorithms')).toBe('Algorithms');
    expect(getRadarAxisLabel('Algorithmic Problem Solving').length).toBeLessThanOrEqual(14);
  });

  it('counts returned statuses exactly once and keeps unknown statuses separate', () => {
    const counts = getAttemptStatusCounts([
      attempt({ _id: 'submitted', status: 'SUBMITTED' }),
      attempt({ _id: 'started', status: 'IN_PROGRESS' }),
      attempt({ _id: 'abandoned', status: 'ABANDONED' }),
      attempt({ _id: 'unknown', status: 'REVIEW' }),
    ]);

    expect(counts).toEqual({ total: 4, submitted: 1, inProgress: 1, abandoned: 1, unknown: 1 });
  });

  it('keeps score history separated by logical quiz and sorts dated submitted scores chronologically', () => {
    const attempts = [
      attempt({ _id: 'later', assessmentId: 'regen-2', status: 'SUBMITTED', submittedAt: '2026-04-02T10:00:00Z', percentage: 75 }),
      attempt({ _id: 'earlier', assessmentId: 'regen-1', status: 'SUBMITTED', submittedAt: '2026-04-01T10:00:00Z', percentage: 50 }),
      attempt({ _id: 'unrelated', assessmentId: 'other', status: 'SUBMITTED', submittedAt: '2026-04-03T10:00:00Z', percentage: 80 }),
      attempt({ _id: 'unfinished', status: 'IN_PROGRESS', submittedAt: '2026-04-04T10:00:00Z', percentage: 99 }),
      attempt({ _id: 'no-date', status: 'SUBMITTED', submittedAt: undefined, percentage: 65 }),
    ];
    const groups = getScoreHistoryGroups(attempts, {
      'regen-1': metadata,
      'regen-2': metadata,
      other: { ...metadata, topicId: 'other-topic' },
    }, { 'regen-1': 'Quiz A', 'regen-2': 'Quiz A', other: 'Quiz B' }, new Map());

    expect(groups).toHaveLength(2);
    expect(groups.find((group) => group.label === 'Quiz A')?.points.map((point) => point.attemptId)).toEqual(['earlier', 'later']);
    expect(groups.find((group) => group.label === 'Quiz A')?.assessmentIds).toEqual(['regen-1', 'regen-2']);
    expect(groups.flatMap((group) => group.points.map((point) => point.attemptId))).not.toContain('unfinished');
    expect(groups.flatMap((group) => group.points.map((point) => point.attemptId))).not.toContain('no-date');
  });

  it('uses a distinct exact-assessment series when logical metadata is unavailable', () => {
    const groups = getScoreHistoryGroups([
      attempt({ _id: 'one', assessmentId: 'assessment-one', status: 'SUBMITTED', submittedAt: '2026-04-01T10:00:00Z', percentage: 40 }),
      attempt({ _id: 'two', assessmentId: 'assessment-two', status: 'SUBMITTED', submittedAt: '2026-04-02T10:00:00Z', percentage: 60 }),
    ], {}, {}, new Map());

    expect(groups).toHaveLength(2);
    expect(groups.map((group) => group.assessmentIds[0]).sort()).toEqual(['assessment-one', 'assessment-two']);
  });

  it('selects only valid skill percentages from a submitted attempt', () => {
    const valid = getAttemptSkillScores(attempt({
      status: 'SUBMITTED',
      skillPerformance: [
        { skillId: 'algorithms', skillName: 'Algorithms', percentage: 82 },
        { skillId: 'missing', percentage: undefined },
        { skillId: 'outside', percentage: 120 },
        { skillId: '', percentage: 50 },
      ],
    }));
    expect(valid.map((skill) => skill.skillId)).toEqual(['algorithms']);
    expect(getAttemptSkillScores(attempt({ status: 'IN_PROGRESS', skillPerformance: [{ skillId: 'x', percentage: 70 }] }))).toEqual([]);
  });

  it('offers radar inputs only as meaningful when one attempt has at least three valid skills', () => {
    const twoSkills = attempt({ status: 'SUBMITTED', skillPerformance: [
      { skillId: 'one', percentage: 60 },
      { skillId: 'two', percentage: 70 },
    ] });
    const threeSkills = attempt({ status: 'SUBMITTED', skillPerformance: [
      { skillId: 'one', percentage: 60 },
      { skillId: 'two', percentage: 70 },
      { skillId: 'three', percentage: 80 },
    ] });

    expect(canRenderRadarChart(getRadarChartSkills(twoSkills))).toBe(false);
    expect(canRenderRadarChart(getRadarChartSkills(threeSkills))).toBe(true);
  });

  it('calculates percentage-point change only for the same submitted assessment and skill', () => {
    const previous = attempt({
      _id: 'previous', status: 'SUBMITTED', assessmentId: 'same-assessment',
      submittedAt: '2026-04-01T10:00:00Z', skillPerformance: [{ skillId: 'algorithms', skillName: 'Algorithms', percentage: 54 }],
    });
    const latest = attempt({
      _id: 'latest', status: 'SUBMITTED', assessmentId: 'same-assessment',
      submittedAt: '2026-04-02T10:00:00Z', skillPerformance: [{ skillId: 'algorithms', skillName: 'Algorithms', percentage: 71 }],
    });
    const regenerated = attempt({
      _id: 'different-assessment', status: 'SUBMITTED', assessmentId: 'regenerated',
      submittedAt: '2026-04-03T10:00:00Z', skillPerformance: [{ skillId: 'algorithms', percentage: 95 }],
    });
    const unfinished = attempt({
      _id: 'unfinished', status: 'IN_PROGRESS', assessmentId: 'same-assessment',
      submittedAt: undefined, skillPerformance: [{ skillId: 'algorithms', percentage: 100 }],
    });

    const improvements = getSkillImprovements([latest, regenerated, unfinished, previous], { 'same-assessment': 'Same quiz' });
    expect(improvements).toHaveLength(1);
    expect(improvements[0]).toMatchObject({
      assessmentId: 'same-assessment', skillId: 'algorithms', earlierScore: 54, laterScore: 71, changePoints: 17,
    });
  });

  it('returns no improvement or comparison when the required evidence is insufficient', () => {
    const oneResult = attempt({ status: 'SUBMITTED', submittedAt: '2026-04-01T10:00:00Z', skillPerformance: [{ skillId: 'one', percentage: 50 }] });
    const noSkillResults = attempt({ _id: 'second', status: 'SUBMITTED', submittedAt: '2026-04-02T10:00:00Z', skillPerformance: [] });

    expect(getSkillImprovements([oneResult, noSkillResults], {})).toEqual([]);
    expect(getAttemptSkillScores(attempt({ status: 'SUBMITTED', skillPerformance: [{ skillId: 'no-score' }] }))).toEqual([]);
  });
});
