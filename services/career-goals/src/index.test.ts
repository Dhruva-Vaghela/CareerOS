import { describe, it, expect } from 'vitest';
import { TimelineOption, CareerGoalStatus } from '@careeros/shared-types';

describe('Career Goal Unit Tests', () => {
  it('should support required timeline options', () => {
    const validTimelines = Object.values(TimelineOption);
    expect(validTimelines).toContain('3 Months');
    expect(validTimelines).toContain('6 Months');
    expect(validTimelines).toContain('12 Months');
    expect(validTimelines).toContain('18 Months');
    expect(validTimelines).toContain('24 Months');
    expect(validTimelines).toContain('Custom');
  });

  it('should validate goal status enum', () => {
    expect(CareerGoalStatus.ACTIVE).toBe('ACTIVE');
    expect(CareerGoalStatus.COMPLETED).toBe('COMPLETED');
    expect(CareerGoalStatus.ABANDONED).toBe('ABANDONED');
  });
});
