import type { AIRequest } from './contracts.js';
import { ContextAdapters } from './context-adapters.js';
import { ContextCompressor } from './context-compressor.js';
import type {
  AIReadyContext,
  ContextSourceKey,
  ContextSourceProvider,
  ContextSources,
} from './context-contracts.js';
import { ContextSelector } from './context-selector.js';
import { ContextSerializer } from './context-serializer.js';
import { TaskRegistry } from './task-registry.js';

export class ContextBuilder {
  constructor(
    private readonly taskRegistry: TaskRegistry = new TaskRegistry(),
    private readonly selector: ContextSelector = new ContextSelector(),
    private readonly adapters: ContextAdapters = new ContextAdapters(),
    private readonly serializer: ContextSerializer = new ContextSerializer(),
    private readonly compressor: ContextCompressor = new ContextCompressor(),
  ) {}

  public build(request: AIRequest, sources: ContextSources): AIRequest {
    const task = this.taskRegistry.get(request.task);
    const selected = this.selector.select(task.requiredContext, sources);
    const adapted = Object.fromEntries(
      Object.entries(selected).map(([source, value]) => [
        source,
        this.adapters.adapt(source as ContextSourceKey, value, {
          digitalTwinPartitions: task.digitalTwinPartitions,
        }),
      ]),
    ) as AIReadyContext;

    return {
      ...request,
      context: this.compressor.compress(this.serializer.serialize(adapted)),
    };
  }

  public async buildFromProvider(
    request: AIRequest,
    sourceProvider: ContextSourceProvider,
  ): Promise<AIRequest> {
    const task = this.taskRegistry.get(request.task);
    const entries = await Promise.all(
      task.requiredContext.map(async (source) => [source, await sourceProvider.get(source)] as const),
    );

    return this.build(request, Object.fromEntries(entries) as ContextSources);
  }
}
