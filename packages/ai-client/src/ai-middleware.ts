import type { AIModelAlias, AIProviderName, AIRequest, AIResponse } from './contracts.js';
import { ResponseValidator } from './response-validator.js';
import { RetryEngine } from './retry-engine.js';
import type { AITaskDefinition } from './task-registry.js';
import { Telemetry } from './telemetry.js';

export interface AIExecutionContext {
  request: AIRequest;
  task: AITaskDefinition;
  provider: AIProviderName;
  providerModel: string;
  modelAlias: AIModelAlias;
  executionId: string;
  startedAt: number;
  retryCount: number;
}

export type AIExecutionHandler = (context: AIExecutionContext) => Promise<AIResponse<unknown>>;

export interface AIExecutionMiddleware {
  execute(context: AIExecutionContext, next: AIExecutionHandler): Promise<AIResponse<unknown>>;
}

export class AIExecutionPipeline implements AIExecutionMiddleware {
  constructor(private readonly middleware: readonly AIExecutionMiddleware[]) {}

  public execute(context: AIExecutionContext, operation: AIExecutionHandler): Promise<AIResponse<unknown>> {
    const composed = this.middleware.reduceRight<AIExecutionHandler>(
      (next, current) => async (currentContext) => current.execute(currentContext, next),
      operation,
    );
    return composed(context);
  }
}

export class RetryMiddleware implements AIExecutionMiddleware {
  constructor(private readonly retryEngine: RetryEngine) {}

  public async execute(context: AIExecutionContext, next: AIExecutionHandler): Promise<AIResponse<unknown>> {
    let attempt = 0;
    return this.retryEngine.execute(async () => {
      if (attempt > 0) context.retryCount++;
      attempt++;
      return next(context);
    }, {
      requestId: context.request.requestId,
      provider: context.provider,
      modelAlias: context.modelAlias,
      providerModel: context.providerModel,
    });
  }
}

export class ResponseValidationMiddleware implements AIExecutionMiddleware {
  constructor(private readonly responseValidator: ResponseValidator) {}

  public async execute(context: AIExecutionContext, next: AIExecutionHandler): Promise<AIResponse<unknown>> {
    return this.responseValidator.validate(await next(context), context.task.responseSchema);
  }
}

export class TelemetryMiddleware implements AIExecutionMiddleware {
  constructor(private readonly telemetry: Telemetry, private readonly now: () => number = Date.now) {}

  public async execute(context: AIExecutionContext, next: AIExecutionHandler): Promise<AIResponse<unknown>> {
    const response = await next(context);
    this.telemetry.record({
      requestId: context.request.requestId,
      executionId: context.executionId,
      task: context.task.id,
      provider: context.provider,
      modelAlias: context.modelAlias,
      status: response.success ? 'SUCCESS' : 'FAILURE',
      latencyMs: this.now() - context.startedAt,
      retryCount: context.retryCount,
      timestamp: new Date(this.now()),
    });
    return response;
  }
}
