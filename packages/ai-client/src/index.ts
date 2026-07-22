import { GoogleGenerativeAI } from '@google/generative-ai';
import { createLogger } from '@careeros/logger';

const logger = createLogger('ai-client');

export interface IAIClient {
  generateText(prompt: string, fallback?: string): Promise<string>;
  generateStructuredContent<T>(prompt: string, responseSchema: unknown, fallback?: T): Promise<T>;
}

export class GeminiAIClient implements IAIClient {
  private ai?: GoogleGenerativeAI;
  private isMock = false;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'mock') {
      logger.warn('GEMINI_API_KEY is not set or set to mock. Running in mock mode.');
      this.isMock = true;
    } else {
      logger.info('Gemini AI Client initialized successfully.');
      this.ai = new GoogleGenerativeAI(apiKey);
    }
  }

  public async generateText(prompt: string, fallback?: string): Promise<string> {
    if (this.isMock) {
      logger.info({ prompt }, 'Mock AI: Generating mock response');
      if (fallback !== undefined) return fallback;
      return `Mock text response for prompt: "${prompt.substring(0, 30)}..."`;
    }

    try {
      return await this.retryWithBackoff(async () => {
        const model = this.ai!.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });
        const text = result.response.text();
        if (!text) throw new Error('Empty response from Gemini');
        return text;
      });
    } catch (error) {
      logger.error({ err: error, prompt }, 'Gemini text generation failed after retries');
      if (fallback !== undefined) {
        logger.info('Returning provided fallback response');
        return fallback;
      }
      throw error;
    }
  }

  public async generateStructuredContent<T>(
    prompt: string,
    responseSchema: unknown,
    fallback?: T,
  ): Promise<T> {
    if (this.isMock) {
      logger.info({ prompt }, 'Mock AI: Generating structured mock response');
      if (fallback !== undefined) return fallback;
      throw new Error('Structured mock mode requires a fallback value');
    }

    try {
      return await this.retryWithBackoff(async () => {
        const model = this.ai!.getGenerativeModel({
          model: 'gemini-1.5-flash',
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: responseSchema,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
        });
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });
        const text = result.response.text();
        if (!text) throw new Error('Empty response from Gemini');
        return JSON.parse(text) as T;
      });
    } catch (error) {
      logger.error({ err: error, prompt }, 'Gemini structured content generation failed');
      if (fallback !== undefined) {
        logger.info('Returning provided structured fallback response');
        return fallback;
      }
      throw error;
    }
  }

  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    retries = 3,
    delay = 1000,
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries <= 0) throw error;
      logger.warn({ err: error, retriesLeft: retries, nextDelay: delay }, 'AI call failed, retrying...');
      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.retryWithBackoff(fn, retries - 1, delay * 2);
    }
  }
}
