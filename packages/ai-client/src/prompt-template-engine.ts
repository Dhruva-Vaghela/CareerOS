import { ValidationError } from '@careeros/errors';

export type PromptVariables = Record<string, unknown>;

function normalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalize);
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, normalize(item)]),
    );
  }
  return value;
}

function stringify(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(normalize(value));
}

export class PromptTemplateEngine {
  public render(template: string, variables: PromptVariables): string {
    return template.replace(/{{\s*([A-Za-z][A-Za-z0-9_]*)\s*}}/g, (_match, name: string) => {
      if (!(name in variables)) {
        throw new ValidationError(`Prompt variable "${name}" was not provided.`);
      }
      return stringify(variables[name]);
    });
  }
}
