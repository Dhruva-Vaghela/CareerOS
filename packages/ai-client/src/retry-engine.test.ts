import { describe, expect, it, vi } from 'vitest';
import type { AIResponse } from './contracts.js';
import { RetryEngine } from './retry-engine.js';

const successResponse: AIResponse<{ title: string }> = {
  success: true,
  provider: 'gemini',
  modelAlias: 'DEFAULT_MODEL',
  data: { title: 'Backend roadmap' },
  metadata: {
    requestId: 'request-1',
    timestamp: new Date('2026-01-01T00:00:00.000Z'),
    providerModel: 'gemini-default',
  },
  latencyMs: 1,
  errors: [],
};

const context = {
  requestId: 'request-1',
  provider: 'gemini' as const,
  modelAlias: 'DEFAULT_MODEL' as const,
  providerModel: 'gemini-default',
};

describe('RetryEngine', () => {
  it('retries provider failures with exponential backoff and recovers', async () => {
    const operation = vi.fn()
      .mockResolvedValueOnce({ ...successResponse, success: false, data: undefined, errors: [{ code: 'AI_PROVIDER_ERROR', message: 'Unavailable' }] })
      .mockResolvedValueOnce(successResponse);
    const sleeper = vi.fn().mockResolvedValue(undefined);
    const engine = new RetryEngine({ maxRetries: 2, baseDelayMs: 10, maxDelayMs: 100 }, sleeper);

    const response = await engine.execute(operation, context);

    expect(response).toEqual(successResponse);
    expect(operation).toHaveBeenCalledTimes(2);
    expect(sleeper).toHaveBeenCalledWith(10);
  });

  it('returns a structured timeout error after configured retries', async () => {
    const operation = vi.fn(() => new Promise<AIResponse>(() => undefined));
    const sleeper = vi.fn().mockResolvedValue(undefined);
    const engine = new RetryEngine({ maxRetries: 1, timeoutMs: 1 }, sleeper);

    const response = await engine.execute(operation, context);

    expect(operation).toHaveBeenCalledTimes(2);
    expect(sleeper).toHaveBeenCalledWith(100);
    expect(response).toMatchObject({
      success: false,
      errors: [{ code: 'AI_TIMEOUT_ERROR' }],
    });
  });
});
