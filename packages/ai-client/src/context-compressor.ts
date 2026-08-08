import type { AIReadyContext } from './context-contracts.js';

function compressValue(value: unknown): unknown {
  if (typeof value === 'string') return value.trim().replace(/\s+/g, ' ');
  if (Array.isArray(value)) {
    const compressed = value.map(compressValue).filter((item) => item !== undefined);
    return compressed.filter(
      (item, index) => compressed.findIndex((candidate) => JSON.stringify(candidate) === JSON.stringify(item)) === index,
    );
  }
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .map(([key, item]) => [key, compressValue(item)] as const)
        .filter(([, item]) => item !== '' && item !== undefined),
    );
  }
  return value;
}

export class ContextCompressor {
  public compress(context: AIReadyContext): AIReadyContext {
    return compressValue(context) as AIReadyContext;
  }
}
