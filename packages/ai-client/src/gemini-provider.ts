import {
  GoogleGenAI,
  type GenerateContentParameters,
  type GenerateContentResponse,
} from '@google/genai';
import { AuthenticationError, ProviderError, TimeoutError } from '@careeros/errors';
import { createLogger } from '@careeros/logger';
import type { AIProvider } from './ai-provider.js';
import type { AIConfig } from './config.js';
import type { AIModelAlias, AIRequest, AIResponse } from './contracts.js';

const logger = createLogger('gemini-provider');

export interface GeminiClient {
  models: {
    generateContent: (request: GenerateContentParameters) => Promise<GenerateContentResponse>;
  };
}

export class GeminiProvider implements AIProvider {
  public readonly name = 'gemini' as const;
  public readonly supportsStreaming = true;
  private readonly client: GeminiClient;

  constructor(
    private readonly config: AIConfig,
    client: GeminiClient = new GoogleGenAI({ apiKey: config.geminiApiKey }),
  ) {
    this.client = client;
  }

  public async generate<T = unknown>(
    request: AIRequest,
    model: string,
    modelAlias: AIModelAlias,
  ): Promise<AIResponse<T>> {
    const startedAt = Date.now();
    const timeoutMs = request.options?.timeoutMs ?? this.config.timeoutMs;

    if (this.config.logRequests) {
      logger.info(
        { requestId: request.requestId, task: request.task, modelAlias },
        'AI request started',
      );
    }

    try {
      const result = await this.withTimeout(
        this.client.models.generateContent({
          model,
          contents: request.input.content,
          config: {
            temperature: request.options?.temperature ?? this.config.temperature,
            topP: request.options?.topP ?? this.config.topP,
            maxOutputTokens: request.options?.maxOutputTokens ?? this.config.maxOutputTokens,
            responseMimeType: request.options?.responseSchema ? 'application/json' : undefined,
            responseJsonSchema: request.options?.responseSchema,
          },
        }),
        timeoutMs,
      );
      const text = result.text;
      if (!text) throw new ProviderError('Gemini returned an empty response.');

      const data = request.options?.responseSchema ? (JSON.parse(text) as T) : (text as T);
      const response: AIResponse<T> = {
        success: true,
        provider: this.name,
        modelAlias,
        data,
        metadata: {
          requestId: request.requestId,
          timestamp: new Date(),
          providerModel: model,
          finishReason: result.candidates?.[0]?.finishReason,
        },
        latencyMs: Date.now() - startedAt,
        errors: [],
      };

      if (this.config.logResponses) {
        logger.info(
          { requestId: request.requestId, latencyMs: response.latencyMs },
          'AI request completed',
        );
      }
      return response;
    } catch (error) {
      const providerError = this.toProviderError(error);
      logger.error(
        {
          requestId: request.requestId,
          code: providerError.code,
          latencyMs: Date.now() - startedAt,
        },
        'AI request failed',
      );
      return {
        success: false,
        provider: this.name,
        modelAlias,
        metadata: {
          requestId: request.requestId,
          timestamp: new Date(),
          providerModel: model,
        },
        latencyMs: Date.now() - startedAt,
        errors: [{ code: providerError.code, message: providerError.message }],
      };
    }
  }

  private async withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
    let timeout: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => reject(new TimeoutError()), timeoutMs);
    });

    try {
      return await Promise.race([operation, timeoutPromise]);
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  private toProviderError(error: unknown): ProviderError | AuthenticationError | TimeoutError {
    if (
      error instanceof TimeoutError ||
      error instanceof AuthenticationError ||
      error instanceof ProviderError
    ) {
      return error;
    }
    if (
      error instanceof Error &&
      /(?:401|403|api key|authentication|unauthorized)/i.test(error.message)
    ) {
      return new AuthenticationError();
    }
    return new ProviderError('Gemini provider request failed.');
  }
}
