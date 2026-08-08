import { describe, expect, it } from 'vitest';
import { PromptLoader } from './prompt-loader.js';
import { PromptManager } from './prompt-manager.js';
import { PromptRegistry, type PromptDefinition } from './prompt-registry.js';
import { PromptTemplateEngine } from './prompt-template-engine.js';
import type { AIRequest } from './contracts.js';

const request: AIRequest = {
  requestId: 'request-1',
  task: 'ROADMAP_GENERATION',
  context: { profile: { targetRole: 'Backend Engineer' }, digitalTwin: { skillState: ['TypeScript'] } },
  input: { content: 'Generate a roadmap.' },
  metadata: {},
  timestamp: new Date('2026-01-01T00:00:00.000Z'),
};

describe('PromptRegistry', () => {
  it('registers a placeholder prompt for every AI task', () => {
    expect(new PromptRegistry().list().map((definition) => definition.id)).toEqual([
      'ROADMAP_GENERATION',
      'CAREER_CHATBOT',
      'MOCK_INTERVIEW',
      'PROJECT_REVIEW',
      'RESUME_ANALYSIS',
      'RECOMMENDATION_ENGINE',
    ]);
  });

  it('resolves the requested prompt version', () => {
    const definitions: readonly PromptDefinition[] = [
      { id: 'ROADMAP_GENERATION', version: 'v1', templateFile: 'v1.txt', variables: [], metadata: {} },
      { id: 'ROADMAP_GENERATION', version: 'v2', templateFile: 'v2.txt', variables: [], metadata: {} },
    ];
    const registry = new PromptRegistry(definitions);

    expect(registry.resolve('ROADMAP_GENERATION', 'v1').templateFile).toBe('v1.txt');
    expect(registry.resolve('ROADMAP_GENERATION').version).toBe('v2');
  });
});

describe('PromptLoader', () => {
  it('loads a versioned template from an external file', async () => {
    await expect(new PromptLoader().load('roadmap-generation/v1.txt')).resolves.toContain('{{context}}');
  });
});

describe('PromptTemplateEngine', () => {
  it('substitutes variables with deterministic structured context', () => {
    const engine = new PromptTemplateEngine();
    const template = 'Context={{context}}; Input={{input}}';

    expect(engine.render(template, { context: { b: 2, a: 1 }, input: 'Hello' }))
      .toBe('Context={"a":1,"b":2}; Input=Hello');
  });
});

describe('PromptManager', () => {
  it('loads, resolves, and renders a final prompt without invoking a provider', async () => {
    const prepared = await new PromptManager().prepare(request);

    expect(prepared.input.content).toBe(
      'Task: ROADMAP_GENERATION\nContext: {"digitalTwin":{"skillState":["TypeScript"]},"profile":{"targetRole":"Backend Engineer"}}\nInput: Generate a roadmap.\n',
    );
    expect(prepared.metadata).toMatchObject({
      promptId: 'ROADMAP_GENERATION',
      promptVersion: 'v1',
    });
  });
});
