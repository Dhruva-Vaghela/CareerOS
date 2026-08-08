import type { AIRequest } from './contracts.js';
import { PromptLoader } from './prompt-loader.js';
import { PromptRegistry } from './prompt-registry.js';
import { PromptTemplateEngine, type PromptVariables } from './prompt-template-engine.js';
import { TaskRegistry } from './task-registry.js';

export class PromptManager {
  constructor(
    private readonly taskRegistry: TaskRegistry = new TaskRegistry(),
    private readonly promptRegistry: PromptRegistry = new PromptRegistry(),
    private readonly promptLoader: PromptLoader = new PromptLoader(),
    private readonly templateEngine: PromptTemplateEngine = new PromptTemplateEngine(),
  ) {}

  public async prepare(request: AIRequest, version?: string): Promise<AIRequest> {
    const task = this.taskRegistry.get(request.task);
    const definition = this.promptRegistry.resolve(task.id, version);
    const template = await this.promptLoader.load(definition.templateFile);
    const variables = this.createVariables(request, definition.variables);
    const prompt = this.templateEngine.render(template, variables);

    return {
      ...request,
      input: { ...request.input, content: prompt },
      metadata: {
        ...request.metadata,
        promptId: definition.id,
        promptVersion: definition.version,
      },
    };
  }

  private createVariables(request: AIRequest, names: readonly string[]): PromptVariables {
    const availableVariables: PromptVariables = {
      taskId: request.task,
      context: request.context,
      input: request.input.content,
    };

    return Object.fromEntries(
      names.flatMap((name) =>
        availableVariables[name] === undefined ? [] : [[name, availableVariables[name]]],
      ),
    );
  }
}
