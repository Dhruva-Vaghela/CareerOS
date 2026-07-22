import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import { z } from 'zod';
import { formatError, ValidationError, ConflictError } from '@careeros/errors';
import { InMemoryEventBus } from '@careeros/event-bus';
import { GeminiAIClient } from '@careeros/ai-client';
import { logger } from '@careeros/logger';

describe('CareerOS Foundation Core Verifications', () => {
  
  // 1. Logger verification
  describe('Logger Infrastructure', () => {
    it('should initialize and expose logging interface', () => {
      expect(logger).toBeDefined();
      expect(logger.info).toBeTypeOf('function');
      expect(logger.error).toBeTypeOf('function');
    });
  });

  // 2. Error Handler verification
  describe('Error Framework & Standard Responses', () => {
    it('should format errors to conform with the CareerOS API spec', () => {
      const response = formatError('TEST_CODE', 'Test message', { field: 'username' });
      
      expect(response).toEqual({
        success: false,
        error: {
          code: 'TEST_CODE',
          message: 'Test message',
          details: { field: 'username' },
        },
      });
    });

    it('should instantiate ValidationError with status 400', () => {
      const error = new ValidationError('Bad Request', [{ field: 'email', message: 'Invalid' }]);
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual([{ field: 'email', message: 'Invalid' }]);
    });

    it('should instantiate ConflictError with custom error code', () => {
      const error = new ConflictError('Prerequisite not met', 'MANDATORY_NODE_PROTECTED');
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('MANDATORY_NODE_PROTECTED');
    });
  });

  // 3. Validation Framework verification
  describe('Validation Schema Processing', () => {
    const testSchema = z.object({
      email: z.string().email(),
      age: z.number().min(18),
    });

    it('should validate inputs successfully', () => {
      const payload = { email: 'test@careeros.com', age: 25 };
      const parsed = testSchema.safeParse(payload);
      expect(parsed.success).toBe(true);
    });

    it('should fail on invalid schemas', () => {
      const payload = { email: 'not-an-email', age: 10 };
      const parsed = testSchema.safeParse(payload);
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues).toHaveLength(2);
      }
    });
  });

  // 4. Event Bus verification
  describe('Event Bus Pub/Sub Async Delivery', () => {
    it('should successfully publish events and deliver to subscrbers', async () => {
      const bus = new InMemoryEventBus();
      const mockHandler = vi.fn();
      
      await bus.subscribe('test.event', mockHandler);
      
      const testEvent = {
        name: 'test.event',
        metadata: {
          eventId: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          traceId: crypto.randomUUID(),
        },
        payload: {
          data: 'Hello, World!',
        },
      };

      await bus.publish(testEvent);

      // Wait a short tick since bus events are executed on setImmediate (asynchronous thread)
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockHandler).toHaveBeenCalledTimes(1);
      expect(mockHandler).toHaveBeenCalledWith(testEvent);
    });
  });

  // 5. AI Client Fallbacks & Resilience verification
  describe('AI Client Fallback System', () => {
    beforeEach(() => {
      process.env.GEMINI_API_KEY = 'mock'; // force client to run in mock mode
    });

    it('should fall back to provided defaults on text failure', async () => {
      const client = new GeminiAIClient();
      const text = await client.generateText('Write a bio', 'Default fallback biography text');
      expect(text).toBe('Default fallback biography text');
    });

    it('should fall back to provided structured object on structured schema failure', async () => {
      const client = new GeminiAIClient();
      const schema = {
        type: 'OBJECT',
        properties: {
          summary: { type: 'STRING' },
        },
      };
      const fallbackObj = { summary: 'This is fallback summary' };
      
      const result = await client.generateStructuredContent(
        'Generate structured overview',
        schema,
        fallbackObj,
      );

      expect(result).toEqual(fallbackObj);
    });
  });
});
