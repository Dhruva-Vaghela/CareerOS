import Groq from 'groq-sdk';
import { AuthenticationError, ProviderError, TimeoutError } from '@careeros/errors';
import { createLogger } from '@careeros/logger';
import type { AIProvider } from './ai-provider.js';
import type { AIConfig } from './config.js';
import type { AIModelAlias, AIRequest, AIResponse } from './contracts.js';

const logger = createLogger('groq-provider');

export interface GroqChatCompletionResponse {
  choices: Array<{
    message?: {
      content?: string | null;
    };
    finish_reason?: string | null;
  }>;
}

export interface GroqClient {
  chat: {
    completions: {
      create: (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        params: any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        options?: any,
      ) => Promise<GroqChatCompletionResponse>;
    };
  };
}

export class GroqProvider implements AIProvider {
  public readonly name = 'groq' as const;
  public readonly supportsStreaming = true;
  private readonly client: GroqClient;

  constructor(
    private readonly config: AIConfig,
    client: GroqClient = new Groq({ apiKey: config.groqApiKey }),
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
      const messages: Array<{ role: 'system' | 'user'; content: string }> = [
        ...(request.options?.responseSchema
          ? [
              {
                role: 'system' as const,
                content:
                  'You are an AI curriculum architect. You must output strictly valid JSON conforming to the requested schema. Do not output any commentary, markdown wrappers, or text outside the JSON object.',
              },
            ]
          : []),
        {
          role: 'user' as const,
          content: request.input.content,
        },
      ];

      let result: GroqChatCompletionResponse;
      try {
        result = await this.withTimeout(
          this.client.chat.completions.create({
            model,
            messages,
            temperature: request.options?.temperature ?? this.config.temperature,
            top_p: request.options?.topP ?? this.config.topP,
            max_tokens: request.options?.maxOutputTokens ?? this.config.maxOutputTokens,
            response_format: request.options?.responseSchema
              ? ({ type: 'json_object' } as const)
              : undefined,
          }),
          timeoutMs,
        );
      } catch (err: unknown) {
        const errorObj = err as { status?: number; error?: { code?: string; failed_generation?: string }; message?: string };
        if (
          errorObj?.status === 400 &&
          (errorObj?.error?.code === 'json_validate_failed' ||
            errorObj?.message?.includes('json_validate_failed') ||
            errorObj?.message?.includes('Failed to generate JSON'))
        ) {
          logger.warn(
            { requestId: request.requestId },
            'Groq server-side json_validate_failed. Retrying completion without grammar constraint.',
          );
          result = await this.withTimeout(
            this.client.chat.completions.create({
              model,
              messages,
              temperature: request.options?.temperature ?? this.config.temperature,
              top_p: request.options?.topP ?? this.config.topP,
              max_tokens: request.options?.maxOutputTokens ?? this.config.maxOutputTokens,
            }),
            timeoutMs,
          );
        } else {
          throw err;
        }
      }

      const text = result.choices?.[0]?.message?.content;
      if (!text) throw new ProviderError('Groq returned an empty response.');

      let data: T;
      if (request.options?.responseSchema) {
        let cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
          cleaned = cleaned.substring(firstBrace, lastBrace + 1);
        }
        data = JSON.parse(cleaned) as T;
      } else {
        data = text as T;
      }

      const response: AIResponse<T> = {
        success: true,
        provider: this.name,
        modelAlias,
        data,
        metadata: {
          requestId: request.requestId,
          timestamp: new Date(),
          providerModel: model,
          finishReason: result.choices?.[0]?.finish_reason ?? undefined,
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(
        {
          requestId: request.requestId,
          code: providerError.code,
          message: errorMessage,
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
        errors: [{ code: providerError.code, message: errorMessage }],
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
      /(?:401|403|api key|authentication|unauthorized|invalid api key)/i.test(error.message)
    ) {
      return new AuthenticationError();
    }
    const message = error instanceof Error ? error.message : 'Groq provider request failed.';
    return new ProviderError(message);
  }
}
