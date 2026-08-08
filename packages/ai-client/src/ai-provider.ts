import type {
  AIModelAlias,
  AIProviderName,
  AIRequest,
  AIResponse,
  AIStreamChunk,
} from './contracts.js';

export interface AIProvider {
  readonly name: AIProviderName;
  readonly supportsStreaming: boolean;
  generate<T = unknown>(
    request: AIRequest,
    model: string,
    modelAlias: AIModelAlias,
  ): Promise<AIResponse<T>>;
  stream?(request: AIRequest, model: string): AsyncIterable<AIStreamChunk>;
}
