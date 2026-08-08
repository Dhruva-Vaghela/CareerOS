import { ValidationError } from '@careeros/errors';
import type { AITaskId } from './task-registry.js';

export interface PromptDefinition {
  id: AITaskId;
  version: string;
  templateFile: string;
  variables: readonly string[];
  metadata: Readonly<Record<string, string | number | boolean>>;
}

const PROMPT_DEFINITIONS: readonly PromptDefinition[] = [
  {
    id: 'ROADMAP_GENERATION',
    version: 'v1',
    templateFile: 'roadmap-generation/v1.txt',
    variables: ['taskId', 'context', 'input'],
    metadata: { status: 'placeholder' },
  },
  {
    id: 'CAREER_CHATBOT',
    version: 'v1',
    templateFile: 'career-chatbot/v1.txt',
    variables: ['taskId', 'context', 'input'],
    metadata: { status: 'placeholder' },
  },
  {
    id: 'MOCK_INTERVIEW',
    version: 'v1',
    templateFile: 'mock-interview/v1.txt',
    variables: ['taskId', 'context', 'input'],
    metadata: { status: 'placeholder' },
  },
  {
    id: 'PROJECT_REVIEW',
    version: 'v1',
    templateFile: 'project-review/v1.txt',
    variables: ['taskId', 'context', 'input'],
    metadata: { status: 'placeholder' },
  },
  {
    id: 'RESUME_ANALYSIS',
    version: 'v1',
    templateFile: 'resume-analysis/v1.txt',
    variables: ['taskId', 'context', 'input'],
    metadata: { status: 'placeholder' },
  },
  {
    id: 'RECOMMENDATION_ENGINE',
    version: 'v1',
    templateFile: 'recommendation-engine/v1.txt',
    variables: ['taskId', 'context', 'input'],
    metadata: { status: 'placeholder' },
  },
];

export class PromptRegistry {
  private readonly prompts: ReadonlyMap<AITaskId, ReadonlyMap<string, PromptDefinition>>;

  constructor(definitions: readonly PromptDefinition[] = PROMPT_DEFINITIONS) {
    const prompts = new Map<AITaskId, Map<string, PromptDefinition>>();
    for (const definition of definitions) {
      const versions = prompts.get(definition.id) ?? new Map<string, PromptDefinition>();
      if (versions.has(definition.version)) {
        throw new ValidationError(`Prompt "${definition.id}" version "${definition.version}" is duplicated.`);
      }
      versions.set(definition.version, definition);
      prompts.set(definition.id, versions);
    }
    this.prompts = prompts;
  }

  public resolve(id: AITaskId, version?: string): PromptDefinition {
    const versions = this.prompts.get(id);
    if (!versions) throw new ValidationError(`Prompt "${id}" is not registered.`);

    if (version) {
      const definition = versions.get(version);
      if (!definition) throw new ValidationError(`Prompt "${id}" version "${version}" is not registered.`);
      return definition;
    }

    return [...versions.values()].sort((left, right) => left.version.localeCompare(right.version)).at(-1)!;
  }

  public list(): readonly PromptDefinition[] {
    return [...this.prompts.values()].flatMap((versions) => [...versions.values()]);
  }
}
