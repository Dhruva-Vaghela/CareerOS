import type { AIReadyContext } from './context-contracts.js';

function serializeValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serializeValue);
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, serializeValue(item)]),
    );
  }
  return value;
}

export class ContextSerializer {
  public serialize(context: AIReadyContext): AIReadyContext {
    return serializeValue(context) as AIReadyContext;
  }
}
