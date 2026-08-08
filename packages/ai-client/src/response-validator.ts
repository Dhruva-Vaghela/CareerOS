import type { AIResponse, AIResponseError } from './contracts.js';

interface SchemaValidationResult {
  valid: boolean;
  message?: string;
}

function validateSchema(value: unknown, schema: Record<string, unknown>, path = 'response'): SchemaValidationResult {
  const type = schema.type;
  if (type === 'object') {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return { valid: false, message: `${path} must be an object.` };
    }
    const record = value as Record<string, unknown>;
    const required = schema.required;
    if (Array.isArray(required)) {
      for (const field of required) {
        if (typeof field === 'string' && !(field in record)) {
          return { valid: false, message: `${path}.${field} is required.` };
        }
      }
    }
    const properties = schema.properties;
    if (typeof properties === 'object' && properties !== null && !Array.isArray(properties)) {
      for (const [field, fieldSchema] of Object.entries(properties)) {
        if (field in record && typeof fieldSchema === 'object' && fieldSchema !== null) {
          const result = validateSchema(record[field], fieldSchema as Record<string, unknown>, `${path}.${field}`);
          if (!result.valid) return result;
        }
      }
    }
  }
  if (type === 'array') {
    if (!Array.isArray(value)) return { valid: false, message: `${path} must be an array.` };
    if (typeof schema.items === 'object' && schema.items !== null && !Array.isArray(schema.items)) {
      for (const [index, item] of value.entries()) {
        const result = validateSchema(item, schema.items as Record<string, unknown>, `${path}[${index}]`);
        if (!result.valid) return result;
      }
    }
  }
  if (type === 'string' && typeof value !== 'string') return { valid: false, message: `${path} must be a string.` };
  if (type === 'number' && typeof value !== 'number') return { valid: false, message: `${path} must be a number.` };
  if (type === 'boolean' && typeof value !== 'boolean') return { valid: false, message: `${path} must be a boolean.` };
  return { valid: true };
}

export class ResponseValidator {
  public validate<T = unknown>(response: AIResponse<unknown>, schema: Record<string, unknown>): AIResponse<T> {
    if (!response.success) return response as AIResponse<T>;

    let data = response.data;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data) as unknown;
      } catch {
        return this.validationFailure(response, 'Response is not valid JSON.');
      }
    }

    const result = validateSchema(data, schema);
    if (!result.valid) return this.validationFailure(response, result.message ?? 'Response schema validation failed.');

    return { ...response, data: data as T };
  }

  private validationFailure<T>(response: AIResponse<unknown>, message: string): AIResponse<T> {
    const errors: AIResponseError[] = [{ code: 'AI_RESPONSE_VALIDATION_ERROR', message }];
    return { ...response, success: false, data: undefined, errors };
  }
}
