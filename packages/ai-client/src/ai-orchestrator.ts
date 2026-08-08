import { randomUUID } from 'node:crypto';
import {
  AIExecutionPipeline,
  type AIExecutionMiddleware,
  ResponseValidationMiddleware,
  RetryMiddleware,
  TelemetryMiddleware,
} from './ai-middleware.js';
import type { AIRequest, AIResponse } from './contracts.js';
import { ProviderFactory } from './provider-factory.js';
import { ResponseValidator } from './response-validator.js';
import { RetryEngine } from './retry-engine.js';
import { TaskRegistry } from './task-registry.js';
import { Telemetry } from './telemetry.js';

export class AIOrchestrator {
  private readonly middleware: AIExecutionMiddleware;

  constructor(
    private readonly providerFactory: ProviderFactory,
    private readonly taskRegistry: TaskRegistry = new TaskRegistry(),
    private readonly createExecutionId: () => string = randomUUID,
    private readonly now: () => number = Date.now,
    private readonly responseValidator: ResponseValidator = new ResponseValidator(),
    private readonly retryEngine: RetryEngine = new RetryEngine(),
    middleware?: AIExecutionMiddleware,
  ) {
    this.middleware = middleware ?? new AIExecutionPipeline([
      new TelemetryMiddleware(new Telemetry()),
      new RetryMiddleware(this.retryEngine),
      new ResponseValidationMiddleware(this.responseValidator),
    ]);
  }

  public async execute<T = unknown>(request: AIRequest): Promise<AIResponse<T>> {
    const executionId = this.createExecutionId();
    const startedAt = this.now();
    const task = this.taskRegistry.get(request.task);
    const provider = this.providerFactory.getProvider();
    const model = this.providerFactory.resolveModel(task.modelAlias);
    const response = await this.middleware.execute({
      request,
      task,
      provider: provider.name,
      providerModel: model,
      modelAlias: task.modelAlias,
      executionId,
      startedAt,
      retryCount: 0,
    }, async () => provider.generate(request, model, task.modelAlias));

    return {
      ...response,
      metadata: { ...response.metadata, executionId },
      latencyMs: this.now() - startedAt,
    } as AIResponse<T>;
  }
}
