import type { AIRequest } from './contracts.js';
import { loadAIConfig } from './config.js';
import { ProviderFactory } from './provider-factory.js';

/**
 * @deprecated Use ProviderFactory and AIProvider directly. This adapter preserves the
 * existing health-check contract while all new callers use the provider foundation.
 */
export interface IAIClient {
  generateText(content: string, fallback?: string): Promise<string>;
  generateStructuredContent<T>(
    content: string,
    responseSchema: Record<string, unknown>,
    fallback?: T,
  ): Promise<T>;
}

export class GeminiAIClient implements IAIClient {
  public async generateText(content: string, fallback?: string): Promise<string> {
    if (process.env.GEMINI_API_KEY === 'mock' && fallback !== undefined) return fallback;
    const response = await this.getProvider().generate<string>(
      this.createRequest(content),
      this.getModel(),
      'DEFAULT_MODEL',
    );
    if (response.success && response.data !== undefined) return response.data;
    if (fallback !== undefined) return fallback;
    throw new Error(response.errors[0]?.message ?? 'AI generation failed.');
  }

  public async generateStructuredContent<T>(
    content: string,
    responseSchema: Record<string, unknown>,
    fallback?: T,
  ): Promise<T> {
    if (process.env.GEMINI_API_KEY === 'mock' && fallback !== undefined) return fallback;
    const response = await this.getProvider().generate<T>(
      { ...this.createRequest(content), options: { responseSchema } },
      this.getModel(),
      'DEFAULT_MODEL',
    );
    if (response.success && response.data !== undefined) return response.data;
    if (fallback !== undefined) return fallback;
    throw new Error(response.errors[0]?.message ?? 'AI generation failed.');
  }

  private getProvider() {
    return this.getFactory().getProvider();
  }

  private getModel(): string {
    return this.getFactory().resolveModel('DEFAULT_MODEL');
  }

  private getFactory(): ProviderFactory {
    return new ProviderFactory(loadAIConfig());
  }

  private createRequest(content: string): AIRequest {
    return {
      requestId: crypto.randomUUID(),
      task: 'LEGACY_AI_CLIENT',
      context: {},
      input: { content },
      metadata: {},
      timestamp: new Date(),
    };
  }
}
