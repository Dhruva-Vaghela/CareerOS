import { describe, expect, it, vi } from 'vitest';
import { Telemetry } from './telemetry.js';

const event = {
  requestId: 'request-1',
  executionId: 'execution-1',
  task: 'ROADMAP_GENERATION',
  provider: 'gemini' as const,
  modelAlias: 'REASONING_MODEL' as const,
  status: 'SUCCESS' as const,
  latencyMs: 42,
  retryCount: 1,
  timestamp: new Date('2026-01-01T00:00:00.000Z'),
};

describe('Telemetry', () => {
  it('records only execution metadata through its provider-independent sink', () => {
    const sink = { record: vi.fn() };

    new Telemetry(sink).record(event);

    expect(sink.record).toHaveBeenCalledWith(event);
  });

  it('ignores synchronous and asynchronous telemetry failures', async () => {
    const synchronousSink = { record: vi.fn(() => { throw new Error('Unavailable'); }) };
    const asynchronousSink = { record: vi.fn().mockRejectedValue(new Error('Unavailable')) };

    expect(() => new Telemetry(synchronousSink).record(event)).not.toThrow();
    expect(() => new Telemetry(asynchronousSink).record(event)).not.toThrow();
    await Promise.resolve();
  });
});
