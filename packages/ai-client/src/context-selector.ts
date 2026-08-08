import type { ContextSourceKey, ContextSources } from './context-contracts.js';

export class ContextSelector {
  public select(
    requiredSources: readonly ContextSourceKey[],
    availableSources: ContextSources,
  ): ContextSources {
    return Object.fromEntries(
      requiredSources.flatMap((source) =>
        availableSources[source] === undefined ? [] : [[source, availableSources[source]]],
      ),
    ) as ContextSources;
  }
}
