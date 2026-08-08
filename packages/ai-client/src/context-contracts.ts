export const CONTEXT_SOURCE_KEYS = [
  'profile',
  'careerGoal',
  'digitalTwin',
  'resume',
  'projects',
  'learning',
  'assessment',
  'interview',
] as const;

export type ContextSourceKey = (typeof CONTEXT_SOURCE_KEYS)[number];

export type ContextSources = Partial<Record<ContextSourceKey, unknown>>;
export type AIReadyContext = Record<string, unknown>;

export interface ContextSourceProvider {
  get(source: ContextSourceKey): Promise<unknown | undefined>;
}

export interface ContextAdapter {
  readonly source: ContextSourceKey;
  adapt(value: unknown, options?: ContextAdapterOptions): unknown;
}

export interface ContextAdapterOptions {
  digitalTwinPartitions?: readonly string[];
}
