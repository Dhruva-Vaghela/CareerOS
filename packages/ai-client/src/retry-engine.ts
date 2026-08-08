import { ProviderError, TimeoutError, ValidationError } from '@careeros/errors';
import type { AIModelAlias, AIProviderName, AIResponse } from './contracts.js';

export interface RetryEngineOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  timeoutMs?: number;
}

export interface RetryExecutionContext {
  requestId: string;
  provider: AIProviderName;
  modelAlias: AIModelAlias;
  providerModel: string;
}

type Sleeper = (milliseconds: number) => Promise<void>;

const sleep: Sleeper = async (milliseconds) => {
  await new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
};

export class RetryEngine {
  private readonly options: Required<RetryEngineOptions>;

  constructor(options: RetryEngineOptions = {}, private readonly sleeper: Sleeper = sleep) {
    this.options = {
      maxRetries: options.maxRetries ?? 0,
      baseDelayMs: options.baseDelayMs ?? 100,
      maxDelayMs: options.maxDelayMs ?? 1_000,
      timeoutMs: options.timeoutMs ?? 0,
    };
    if (
      !Number.isInteger(this.options.maxRetries) ||
      this.options.maxRetries < 0 ||
      this.options.baseDelayMs < 0 ||
      this.options.maxDelayMs < this.options.baseDelayMs ||
      this.options.timeoutMs < 0
    ) {
      throw new ValidationError('Retry engine options are invalid.');
    }
  }

  public async execute<T>(
    operation: () => Promise<AIResponse<T>>,
    context: RetryExecutionContext,
  ): Promise<AIResponse<T>> {
    let lastResponse: AIResponse<T> | undefined;
    for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
      try {
        lastResponse = await this.withTimeout(operation());
      } catch (error) {
        lastResponse = this.failureResponse<T>(context, error);
      }

      if (lastResponse.success || attempt === this.options.maxRetries) return lastResponse;
      await this.sleeper(this.delayFor(attempt));
    }

    return lastResponse!;
  }

  private async withTimeout<T>(operation: Promise<T>): Promise<T> {
    if (this.options.timeoutMs === 0) return operation;

    let timeout: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => reject(new TimeoutError()), this.options.timeoutMs);
    });
    try {
      return await Promise.race([operation, timeoutPromise]);
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  private delayFor(attempt: number): number {
    return Math.min(this.options.baseDelayMs * 2 ** attempt, this.options.maxDelayMs);
  }

  private failureResponse<T>(context: RetryExecutionContext, error: unknown): AIResponse<T> {
    const providerError = error instanceof TimeoutError
      ? error
      : error instanceof ProviderError
        ? error
        : new ProviderError('AI provider request failed.');
    return {
      success: false,
      provider: context.provider,
      modelAlias: context.modelAlias,
      metadata: {
        requestId: context.requestId,
        timestamp: new Date(),
        providerModel: context.providerModel,
      },
      latencyMs: 0,
      errors: [{ code: providerError.code, message: providerError.message }],
    };
  }
}
