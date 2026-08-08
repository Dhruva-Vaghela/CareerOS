import { describe, expect, it, vi } from 'vitest';
import {
  AIExecutionPipeline,
  type AIExecutionContext,
  type AIExecutionMiddleware,
  ResponseValidationMiddleware,
  RetryMiddleware,
  TelemetryMiddleware,
} from './ai-middleware.js';
import type { AIResponse } from './contracts.js';
import { ResponseValidator } from './response-validator.js';
import { RetryEngine } from './retry-engine.js';
import { TaskRegistry } from './task-registry.js';
import { Telemetry } from './telemetry.js';

const response: AIResponse = {
  success: true,
  provider: 'gemini',
  modelAlias: 'REASONING_MODEL',
  data: { roadmap: [] },
  metadata: {
    requestId: 'request-1',
    timestamp: new Date('2026-01-01T00:00:00.000Z'),
    providerModel: 'gemini-reasoning',
  },
  latencyMs: 1,
  errors: [],
};

function executionContext(): AIExecutionContext {
  return {
    request: {
      requestId: 'request-1',
      task: 'ROADMAP_GENERATION',
      context: {},
      input: { content: 'prompt' },
      metadata: {},
      timestamp: new Date('2026-01-01T00:00:00.000Z'),
    },
    task: new TaskRegistry().get('ROADMAP_GENERATION'),
    provider: 'gemini',
    providerModel: 'gemini-reasoning',
    modelAlias: 'REASONING_MODEL',
    executionId: 'execution-1',
    startedAt: 10,
    retryCount: 0,
  };
}

describe('AI middleware', () => {
  it('executes middleware in composition order', async () => {
    const order: string[] = [];
    const middleware = (name: string): AIExecutionMiddleware => ({
      execute: async (context, next) => {
        order.push(`${name}:before`);
        const result = await next(context);
        order.push(`${name}:after`);
        return result;
      },
    });
    const pipeline = new AIExecutionPipeline([middleware('telemetry'), middleware('retry')]);

    await pipeline.execute(executionContext(), async () => {
      order.push('provider');
      return response;
    });

    expect(order).toEqual([
      'telemetry:before',
      'retry:before',
      'provider',
      'retry:after',
      'telemetry:after',
    ]);
  });

  it('composes retry, validation, and telemetry without interrupting execution', async () => {
    const sink = { record: vi.fn() };
    const retry = new RetryMiddleware(new RetryEngine({ maxRetries: 1 }, vi.fn().mockResolvedValue(undefined)));
    const pipeline = new AIExecutionPipeline([
      new TelemetryMiddleware(new Telemetry(sink), () => 35),
      retry,
      new ResponseValidationMiddleware(new ResponseValidator()),
    ]);
    const provider = vi.fn()
      .mockResolvedValueOnce({ ...response, success: false, data: undefined, errors: [{ code: 'AI_PROVIDER_ERROR', message: 'Unavailable' }] })
      .mockResolvedValueOnce(response);
    const context = executionContext();

    const result = await pipeline.execute(context, provider);

    expect(result.success).toBe(true);
    expect(provider).toHaveBeenCalledTimes(2);
    expect(context.retryCount).toBe(1);
    expect(sink.record).toHaveBeenCalledWith(expect.objectContaining({
      executionId: 'execution-1',
      status: 'SUCCESS',
      retryCount: 1,
      latencyMs: 25,
    }));
  });
});
