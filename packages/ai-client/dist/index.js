import { GoogleGenerativeAI } from '@google/generative-ai';
import { createLogger } from '@careeros/logger';
const logger = createLogger('ai-client');
export class GeminiAIClient {
    ai;
    isMock = false;
    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey === 'mock') {
            logger.warn('GEMINI_API_KEY is not set or set to mock. Running in mock mode.');
            this.isMock = true;
        }
        else {
            logger.info('Gemini AI Client initialized successfully.');
            this.ai = new GoogleGenerativeAI(apiKey);
        }
    }
    async generateText(prompt, fallback) {
        if (this.isMock) {
            logger.info({ prompt }, 'Mock AI: Generating mock response');
            if (fallback !== undefined)
                return fallback;
            return `Mock text response for prompt: "${prompt.substring(0, 30)}..."`;
        }
        try {
            return await this.retryWithBackoff(async () => {
                const model = this.ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
                const result = await model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                });
                const text = result.response.text();
                if (!text)
                    throw new Error('Empty response from Gemini');
                return text;
            });
        }
        catch (error) {
            logger.error({ err: error, prompt }, 'Gemini text generation failed after retries');
            if (fallback !== undefined) {
                logger.info('Returning provided fallback response');
                return fallback;
            }
            throw error;
        }
    }
    async generateStructuredContent(prompt, responseSchema, fallback) {
        if (this.isMock) {
            logger.info({ prompt }, 'Mock AI: Generating structured mock response');
            if (fallback !== undefined)
                return fallback;
            throw new Error('Structured mock mode requires a fallback value');
        }
        try {
            return await this.retryWithBackoff(async () => {
                const model = this.ai.getGenerativeModel({
                    model: 'gemini-1.5-flash',
                    generationConfig: {
                        responseMimeType: 'application/json',
                        responseSchema: responseSchema,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    },
                });
                const result = await model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                });
                const text = result.response.text();
                if (!text)
                    throw new Error('Empty response from Gemini');
                return JSON.parse(text);
            });
        }
        catch (error) {
            logger.error({ err: error, prompt }, 'Gemini structured content generation failed');
            if (fallback !== undefined) {
                logger.info('Returning provided structured fallback response');
                return fallback;
            }
            throw error;
        }
    }
    async retryWithBackoff(fn, retries = 3, delay = 1000) {
        try {
            return await fn();
        }
        catch (error) {
            if (retries <= 0)
                throw error;
            logger.warn({ err: error, retriesLeft: retries, nextDelay: delay }, 'AI call failed, retrying...');
            await new Promise((resolve) => setTimeout(resolve, delay));
            return this.retryWithBackoff(fn, retries - 1, delay * 2);
        }
    }
}
//# sourceMappingURL=index.js.map