import { describe, expect, it, vi } from 'vitest';
import type { AIProvider } from './ai-provider.js';
import { AIOrchestrator } from './ai-orchestrator.js';
import type { AIRequest, AIResponse } from './contracts.js';
import { ProviderFactory } from './provider-factory.js';
import { TaskRegistry } from './task-registry.js';

const request: AIRequest = {
  requestId: 'request-1',
  task: 'ROADMAP_GENERATION',
  context: { userId: 'user-1' },
  input: { content: 'Generate a roadmap.' },
  metadata: { source: 'test' },
  timestamp: new Date('2026-01-01T00:00:00.000Z'),
};

describe('TaskRegistry', () => {
  it('registers every placeholder task with provider-agnostic execution metadata', () => {
    const tasks = new TaskRegistry().list();

    expect(tasks.map((task) => task.id)).toEqual([
      'ROADMAP_GENERATION',
      'CAREER_CHATBOT',
      'MOCK_INTERVIEW',
      'PROJECT_REVIEW',
      'RESUME_ANALYSIS',
      'RECOMMENDATION_ENGINE',
    ]);
    for (const task of tasks) {
      expect(task).toEqual(
        expect.objectContaining({
          description: expect.any(String),
          modelAlias: expect.stringMatching(/^(DEFAULT|FAST|REASONING)_MODEL$/),
          promptTemplateName: expect.any(String),
          requiredContext: expect.any(Array),
          responseSchema: expect.any(Object),
          retryStrategy: { name: 'NO_RETRY', maxAttempts: 1 },
        }),
      );
    }
  });
});

describe('AIOrchestrator', () => {
  it('resolves the task, model alias, and provider through the execution pipeline', async () => {
    const providerResponse: AIResponse<{ title: string }> = {
      success: true,
      provider: 'gemini',
      modelAlias: 'REASONING_MODEL',
      data: { title: 'Backend roadmap' },
      metadata: {
        requestId: request.requestId,
        timestamp: new Date('2026-01-01T00:00:01.000Z'),
        providerModel: 'gemini-reasoning',
      },
      latencyMs: 4,
      errors: [],
    };
    const provider: AIProvider = {
      name: 'gemini',
      supportsStreaming: false,
      generate: vi.fn().mockResolvedValue(providerResponse),
    };
    const factory = {
      getProvider: vi.fn().mockReturnValue(provider),
      resolveModel: vi.fn().mockReturnValue('gemini-reasoning'),
    } as unknown as ProviderFactory;
    const now = vi.fn().mockReturnValueOnce(100).mockReturnValueOnce(145);
    const orchestrator = new AIOrchestrator(factory, new TaskRegistry(), () => 'execution-1', now);

    const response = await orchestrator.execute<{ title: string }>(request);

    expect(factory.getProvider).toHaveBeenCalledOnce();
    expect(factory.resolveModel).toHaveBeenCalledWith('REASONING_MODEL');
    expect(provider.generate).toHaveBeenCalledWith(request, 'gemini-reasoning', 'REASONING_MODEL');
    expect(response).toMatchObject({
      success: true,
      data: { title: 'Backend roadmap' },
      latencyMs: 45,
      metadata: { requestId: request.requestId, executionId: 'execution-1' },
    });
  });

  it('returns a provider failure as a structured AIResponse with an execution ID', async () => {
    const provider: AIProvider = {
      name: 'gemini',
      supportsStreaming: false,
      generate: vi.fn().mockResolvedValue({
        success: false,
        provider: 'gemini',
        modelAlias: 'REASONING_MODEL',
        metadata: {
          requestId: request.requestId,
          timestamp: new Date('2026-01-01T00:00:01.000Z'),
          providerModel: 'gemini-reasoning',
        },
        latencyMs: 3,
        errors: [{ code: 'AI_PROVIDER_ERROR', message: 'Provider unavailable' }],
      } satisfies AIResponse),
    };
    const factory = {
      getProvider: vi.fn().mockReturnValue(provider),
      resolveModel: vi.fn().mockReturnValue('gemini-reasoning'),
    } as unknown as ProviderFactory;
    const orchestrator = new AIOrchestrator(factory, new TaskRegistry(), () => 'execution-2');

    const response = await orchestrator.execute(request);

    expect(response).toMatchObject({
      success: false,
      metadata: { executionId: 'execution-2' },
      errors: [{ code: 'AI_PROVIDER_ERROR' }],
    });
  });
});
