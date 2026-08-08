import { describe, expect, it, vi } from 'vitest';
import { ConfigurationError, UnsupportedProviderError } from '@careeros/errors';
import type { AIConfig } from './config.js';
import { loadAIConfig, resolveModelAlias } from './config.js';
import type { AIRequest, AIResponse } from './contracts.js';
import { GeminiProvider, type GeminiClient } from './gemini-provider.js';
import { ProviderFactory } from './provider-factory.js';

const environment: NodeJS.ProcessEnv = {
  AI_PROVIDER: 'gemini',
  GEMINI_API_KEY: 'test-key',
  AI_DEFAULT_MODEL: 'gemini-default',
  AI_FAST_MODEL: 'gemini-fast',
  AI_FALLBACK_MODEL: 'gemini-reasoning',
  AI_TEMPERATURE: '0.2',
  AI_TOP_P: '0.9',
  AI_MAX_OUTPUT_TOKENS: '1024',
  AI_MAX_RETRIES: '1',
  AI_TIMEOUT_MS: '1000',
  AI_LOG_REQUESTS: 'false',
  AI_LOG_RESPONSES: 'false',
};

const request: AIRequest = {
  requestId: 'request-1',
  task: 'ROADMAP_GENERATION',
  context: { userId: 'user-1' },
  input: { content: 'Generate a roadmap.' },
  metadata: { source: 'test' },
  timestamp: new Date('2026-01-01T00:00:00.000Z'),
};

describe('AI configuration', () => {
  it('loads configuration and resolves provider-neutral model aliases', () => {
    const config = loadAIConfig(environment);

    expect(config.provider).toBe('gemini');
    expect(resolveModelAlias(config, 'DEFAULT_MODEL')).toBe('gemini-default');
    expect(resolveModelAlias(config, 'FAST_MODEL')).toBe('gemini-fast');
    expect(resolveModelAlias(config, 'REASONING_MODEL')).toBe('gemini-reasoning');
  });

  it('rejects incomplete configuration', () => {
    expect(() => loadAIConfig({ ...environment, GEMINI_API_KEY: '' })).toThrow(ConfigurationError);
  });
});

describe('ProviderFactory', () => {
  it('returns GeminiProvider for the configured Gemini provider', () => {
    const factory = new ProviderFactory(loadAIConfig(environment));

    expect(factory.getProvider()).toBeInstanceOf(GeminiProvider);
    expect(factory.resolveModel('FAST_MODEL')).toBe('gemini-fast');
  });

  it('throws a descriptive error when the configured provider is unsupported', () => {
    const config: AIConfig = { ...loadAIConfig(environment), provider: 'openai' };
    const factory = new ProviderFactory(config);

    expect(() => factory.getProvider()).toThrow(UnsupportedProviderError);
  });
});

describe('GeminiProvider', () => {
  it('delegates to the Google Gen AI SDK and returns a structured success response', async () => {
    const generateContent = vi.fn().mockResolvedValue({
      text: '{"title":"Backend roadmap"}',
      candidates: [{ finishReason: 'STOP' }],
    });
    const client: GeminiClient = { models: { generateContent } };
    const provider = new GeminiProvider(loadAIConfig(environment), client);

    const response = await provider.generate<{ title: string }>(
      { ...request, options: { responseSchema: { type: 'object' } } },
      'gemini-default',
      'DEFAULT_MODEL',
    );

    expect(generateContent).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gemini-default', contents: 'Generate a roadmap.' }),
    );
    expect(response).toMatchObject({
      success: true,
      provider: 'gemini',
      modelAlias: 'DEFAULT_MODEL',
      data: { title: 'Backend roadmap' },
      errors: [],
    });
  });

  it('returns a structured timeout error', async () => {
    const client: GeminiClient = {
      models: { generateContent: () => new Promise(() => undefined) },
    };
    const provider = new GeminiProvider(loadAIConfig(environment), client);

    const response = await provider.generate(
      { ...request, options: { timeoutMs: 1 } },
      'gemini-default',
      'DEFAULT_MODEL',
    );

    expect(response).toMatchObject({ success: false, errors: [{ code: 'AI_TIMEOUT_ERROR' }] });
  });
});

describe('AI contracts', () => {
  it('supports the reusable request and response contract shapes', () => {
    const response: AIResponse<string> = {
      success: true,
      provider: 'gemini',
      modelAlias: 'DEFAULT_MODEL',
      data: 'generated content',
      metadata: {
        requestId: request.requestId,
        timestamp: new Date(),
        providerModel: 'gemini-default',
      },
      latencyMs: 10,
      errors: [],
    };

    expect(request.task).toBe('ROADMAP_GENERATION');
    expect(response.data).toBe('generated content');
  });
});
