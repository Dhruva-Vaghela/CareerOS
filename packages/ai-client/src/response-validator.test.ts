import { describe, expect, it } from 'vitest';
import { ResponseValidator } from './response-validator.js';
import type { AIResponse } from './contracts.js';

const response: AIResponse<string> = {
  success: true,
  provider: 'gemini',
  modelAlias: 'DEFAULT_MODEL',
  data: '{"title":"Backend roadmap"}',
  metadata: {
    requestId: 'request-1',
    timestamp: new Date('2026-01-01T00:00:00.000Z'),
    providerModel: 'gemini-default',
  },
  latencyMs: 1,
  errors: [],
};

describe('ResponseValidator', () => {
  it('parses valid JSON and returns structured validated data', () => {
    const validated = new ResponseValidator().validate<{ title: string }>(response, {
      type: 'object',
      required: ['title'],
      properties: { title: { type: 'string' } },
    });

    expect(validated).toMatchObject({ success: true, data: { title: 'Backend roadmap' }, errors: [] });
  });

  it('returns a structured validation error for invalid JSON or schema data', () => {
    const validator = new ResponseValidator();
    const invalidJson = validator.validate({ ...response, data: 'not json' }, { type: 'object' });
    const invalidSchema = validator.validate({ ...response, data: '{"title":4}' }, {
      type: 'object',
      properties: { title: { type: 'string' } },
    });

    expect(invalidJson).toMatchObject({
      success: false,
      errors: [{ code: 'AI_RESPONSE_VALIDATION_ERROR' }],
    });
    expect(invalidSchema).toMatchObject({
      success: false,
      errors: [{ code: 'AI_RESPONSE_VALIDATION_ERROR', message: 'response.title must be a string.' }],
    });
  });
});
