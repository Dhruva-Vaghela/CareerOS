export interface IAIClient {
    generateText(prompt: string, fallback?: string): Promise<string>;
    generateStructuredContent<T>(prompt: string, responseSchema: unknown, fallback?: T): Promise<T>;
}
export declare class GeminiAIClient implements IAIClient {
    private ai?;
    private isMock;
    constructor();
    generateText(prompt: string, fallback?: string): Promise<string>;
    generateStructuredContent<T>(prompt: string, responseSchema: unknown, fallback?: T): Promise<T>;
    private retryWithBackoff;
}
//# sourceMappingURL=index.d.ts.map