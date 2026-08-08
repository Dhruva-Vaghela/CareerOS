export const AI_MODEL_ALIASES = ['DEFAULT_MODEL', 'FAST_MODEL', 'REASONING_MODEL'] as const;

export type AIModelAlias = (typeof AI_MODEL_ALIASES)[number];
export type AIProviderName = 'gemini' | 'openai' | 'claude' | 'groq' | 'openrouter';

export interface AIRequestInput {
  content: string;
}

export interface AIRequestOptions {
  modelAlias?: AIModelAlias;
  temperature?: number;
  topP?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
  responseSchema?: Record<string, unknown>;
  stream?: boolean;
}

export interface AIRequest {
  requestId: string;
  task: string;
  context: Record<string, unknown>;
  input: AIRequestInput;
  options?: AIRequestOptions;
  metadata: Record<string, string | number | boolean | undefined>;
  timestamp: Date;
}

export interface AIResponseMetadata {
  requestId: string;
  executionId?: string;
  timestamp: Date;
  providerModel: string;
  finishReason?: string;
}

export interface AIResponseError {
  code: string;
  message: string;
}

export interface AIResponse<T = unknown> {
  success: boolean;
  provider: AIProviderName;
  modelAlias: AIModelAlias;
  data?: T;
  metadata: AIResponseMetadata;
  latencyMs: number;
  errors: AIResponseError[];
}

export interface AIStreamChunk {
  text: string;
  isComplete: boolean;
}
