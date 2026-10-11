import { describe, expect, it } from 'vitest';
import { getSkillTrackingAttemptNumbers } from './SkillTrackingView';

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
