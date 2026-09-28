import { describe, expect, it, vi } from 'vitest';
import { ConfigurationError, UnsupportedProviderError } from '@careeros/errors';
import type { AIConfig } from './config.js';
import { loadAIConfig, resolveModelAlias } from './config.js';
import type { AIRequest, AIResponse } from './contracts.js';
import { GroqProvider, type GroqClient } from './groq-provider.js';
import { ProviderFactory } from './provider-factory.js';

const environment: NodeJS.ProcessEnv = {
  AI_PROVIDER: 'groq',
  GROQ_API_KEY: 'test-key',
  AI_DEFAULT_MODEL: 'llama-3.3-70b-versatile',
  AI_FAST_MODEL: 'llama-3.1-8b-instant',
  AI_FALLBACK_MODEL: 'llama-3.3-70b-versatile',
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

    expect(config.provider).toBe('groq');
    expect(resolveModelAlias(config, 'DEFAULT_MODEL')).toBe('llama-3.3-70b-versatile');
    expect(resolveModelAlias(config, 'FAST_MODEL')).toBe('llama-3.1-8b-instant');
    expect(resolveModelAlias(config, 'REASONING_MODEL')).toBe('llama-3.3-70b-versatile');
  });

  it('supports GROQ_MODEL environment variable as fallback for default model', () => {
    const customEnv: NodeJS.ProcessEnv = {
      ...environment,
      AI_DEFAULT_MODEL: undefined,
      AI_FAST_MODEL: undefined,
      AI_FALLBACK_MODEL: undefined,
      GROQ_MODEL: 'llama-3.3-70b-versatile',
    };
    const config = loadAIConfig(customEnv);

    expect(config.defaultModel).toBe('llama-3.3-70b-versatile');
    expect(config.fastModel).toBe('llama-3.3-70b-versatile');
    expect(config.fallbackModel).toBe('llama-3.3-70b-versatile');
  });

  it('rejects incomplete configuration', () => {
    expect(() => loadAIConfig({ ...environment, GROQ_API_KEY: '' })).toThrow(ConfigurationError);
  });
});

describe('ProviderFactory', () => {
  it('returns GroqProvider for the configured Groq provider', () => {
    const factory = new ProviderFactory(loadAIConfig(environment));

    expect(factory.getProvider()).toBeInstanceOf(GroqProvider);
    expect(factory.resolveModel('FAST_MODEL')).toBe('llama-3.1-8b-instant');
  });

  it('throws a descriptive error when the configured provider is unsupported', () => {
    const config: AIConfig = { ...loadAIConfig(environment), provider: 'openai' };
    const factory = new ProviderFactory(config);

    expect(() => factory.getProvider()).toThrow(UnsupportedProviderError);
  });
});

describe('GroqProvider', () => {
  it('delegates to the Groq SDK and returns a structured success response', async () => {
    const create = vi.fn().mockResolvedValue({
      choices: [
        {
          message: { content: '{"title":"Backend roadmap"}' },
          finish_reason: 'stop',
        },
      ],
    });
    const client: GroqClient = { chat: { completions: { create } } };
    const provider = new GroqProvider(loadAIConfig(environment), client);

    const response = await provider.generate<{ title: string }>(
      { ...request, options: { responseSchema: { type: 'object' } } },
      'llama-3.3-70b-versatile',
      'DEFAULT_MODEL',
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'llama-3.3-70b-versatile',
        messages: expect.arrayContaining([{ role: 'user', content: 'Generate a roadmap.' }]),
        response_format: { type: 'json_object' },
      }),
    );
    expect(response).toMatchObject({
      success: true,
      provider: 'groq',
      modelAlias: 'DEFAULT_MODEL',
      data: { title: 'Backend roadmap' },
      errors: [],
    });
  });

  it('returns a structured timeout error', async () => {
    const client: GroqClient = {
      chat: { completions: { create: () => new Promise(() => undefined) } },
    };
    const provider = new GroqProvider(loadAIConfig(environment), client);

    const response = await provider.generate(
      { ...request, options: { timeoutMs: 1 } },
      'llama-3.3-70b-versatile',
      'DEFAULT_MODEL',
    );

    expect(response).toMatchObject({ success: false, errors: [{ code: 'AI_TIMEOUT_ERROR' }] });
  });
});

describe('AI contracts', () => {
  it('supports the reusable request and response contract shapes', () => {
    const response: AIResponse<string> = {
      success: true,
      provider: 'groq',
      modelAlias: 'DEFAULT_MODEL',
      data: 'generated content',
      metadata: {
        requestId: request.requestId,
        timestamp: new Date(),
        providerModel: 'llama-3.3-70b-versatile',
      },
      latencyMs: 10,
      errors: [],
    };

    expect(request.task).toBe('ROADMAP_GENERATION');
    expect(response.data).toBe('generated content');
  });
});
