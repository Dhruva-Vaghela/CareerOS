import { UnsupportedProviderError } from '@careeros/errors';
import type { AIProvider } from './ai-provider.js';
import { loadAIConfig, resolveModelAlias, type AIConfig } from './config.js';
import type { AIModelAlias } from './contracts.js';
import { GeminiProvider } from './gemini-provider.js';

export class ProviderFactory {
  private readonly providers: Partial<Record<AIConfig['provider'], AIProvider>>;

  constructor(
    private readonly config: AIConfig = loadAIConfig(),
    providers: Partial<Record<AIConfig['provider'], AIProvider>> = {},
  ) {
    this.providers = {
      gemini: new GeminiProvider(config),
      ...providers,
    };
  }

  public getProvider(): AIProvider {
    const provider = this.providers[this.config.provider];
    if (!provider) throw new UnsupportedProviderError(this.config.provider);
    return provider;
  }

  public resolveModel(alias: AIModelAlias): string {
    return resolveModelAlias(this.config, alias);
  }
}
