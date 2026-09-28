import { ConfigurationError } from '@careeros/errors';
import type { AIModelAlias, AIProviderName } from './contracts.js';

export interface AIConfig {
  provider: AIProviderName;
  groqApiKey: string;
  defaultModel: string;
  fastModel: string;
  fallbackModel: string;
  temperature: number;
  topP: number;
  maxOutputTokens: number;
  maxRetries: number;
  timeoutMs: number;
  logRequests: boolean;
  logResponses: boolean;
}

const SUPPORTED_PROVIDERS: readonly AIProviderName[] = [
  'groq',
  'openai',
  'claude',
  'gemini',
  'openrouter',
];

function requireValue(environment: NodeJS.ProcessEnv, name: string): string {
  const value = environment[name]?.trim();
  if (!value) throw new ConfigurationError(`${name} must be configured.`);
  return value;
}

function readNumber(environment: NodeJS.ProcessEnv, name: string): number {
  const value = Number(requireValue(environment, name));
  if (!Number.isFinite(value) || value < 0) {
    throw new ConfigurationError(`${name} must be a non-negative number.`);
  }
  return value;
}

function readBoolean(environment: NodeJS.ProcessEnv, name: string): boolean {
  const value = requireValue(environment, name).toLowerCase();
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new ConfigurationError(`${name} must be either true or false.`);
}

export function loadAIConfig(environment: NodeJS.ProcessEnv = process.env): AIConfig {
  const providerValue = requireValue(environment, 'AI_PROVIDER').toLowerCase();
  if (!SUPPORTED_PROVIDERS.includes(providerValue as AIProviderName)) {
    throw new ConfigurationError(`AI_PROVIDER "${providerValue}" is not supported.`);
  }

  const defaultModel =
    environment.AI_DEFAULT_MODEL?.trim() ||
    environment.GROQ_MODEL?.trim() ||
    'openai/gpt-oss-120b';

  const fastModel =
    environment.AI_FAST_MODEL?.trim() ||
    environment.GROQ_FAST_MODEL?.trim() ||
    (defaultModel === 'openai/gpt-oss-120b' ? 'openai/gpt-oss-20b' : defaultModel);

  const fallbackModel =
    environment.AI_FALLBACK_MODEL?.trim() ||
    environment.GROQ_FALLBACK_MODEL?.trim() ||
    defaultModel;

  return {
    provider: providerValue as AIProviderName,
    groqApiKey: requireValue(environment, 'GROQ_API_KEY'),
    defaultModel,
    fastModel,
    fallbackModel,
    temperature: readNumber(environment, 'AI_TEMPERATURE'),
    topP: readNumber(environment, 'AI_TOP_P'),
    maxOutputTokens: readNumber(environment, 'AI_MAX_OUTPUT_TOKENS'),
    maxRetries: readNumber(environment, 'AI_MAX_RETRIES'),
    timeoutMs: readNumber(environment, 'AI_TIMEOUT_MS'),
    logRequests: readBoolean(environment, 'AI_LOG_REQUESTS'),
    logResponses: readBoolean(environment, 'AI_LOG_RESPONSES'),
  };
}

export function resolveModelAlias(config: AIConfig, alias: AIModelAlias): string {
  switch (alias) {
    case 'DEFAULT_MODEL':
      return config.defaultModel;
    case 'FAST_MODEL':
      return config.fastModel;
    case 'REASONING_MODEL':
      return config.fallbackModel;
  }
}
