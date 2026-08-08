import { describe, expect, it, vi } from 'vitest';
import { AIOrchestrator } from './ai-orchestrator.js';
import {
  AssessmentContextAdapter,
  CareerGoalContextAdapter,
  ContextAdapters,
  DigitalTwinContextAdapter,
  InterviewContextAdapter,
  LearningContextAdapter,
  ProfileContextAdapter,
  ProjectsContextAdapter,
  ResumeContextAdapter,
} from './context-adapters.js';
import { ContextBuilder } from './context-builder.js';
import { ContextCompressor } from './context-compressor.js';
import { ContextSelector } from './context-selector.js';
import { ContextSerializer } from './context-serializer.js';
import type { AIRequest, AIResponse } from './contracts.js';
import { ProviderFactory } from './provider-factory.js';

const request: AIRequest = {
  requestId: 'request-1',
  task: 'ROADMAP_GENERATION',
  context: {},
  input: { content: 'Generate a roadmap.' },
  metadata: {},
  timestamp: new Date('2026-01-01T00:00:00.000Z'),
};

describe('ContextSelector', () => {
  it('selects only the sources declared by the requested task', () => {
    const selected = new ContextSelector().select(['profile', 'careerGoal'], {
      profile: { targetRole: 'Backend Engineer' },
      careerGoal: { targetRole: 'Backend Engineer' },
      resume: { summary: 'Do not include' },
    });

    expect(selected).toEqual({
      profile: { targetRole: 'Backend Engineer' },
      careerGoal: { targetRole: 'Backend Engineer' },
    });
  });
});

describe('ContextSerializer', () => {
  it('normalizes provider-independent context values', () => {
    const serialized = new ContextSerializer().serialize({
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      profile: { targetRole: 'Backend Engineer', omitted: undefined },
    });

    expect(serialized).toEqual({
      profile: { targetRole: 'Backend Engineer' },
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
  });
});

describe('ContextCompressor', () => {
  it('removes redundant values while preserving required context', () => {
    const compressed = new ContextCompressor().compress({
      profile: { targetRole: '  Backend   Engineer  ', empty: '' },
      skills: ['TypeScript', 'TypeScript', 'Node.js'],
    });

    expect(compressed).toEqual({
      profile: { targetRole: 'Backend Engineer' },
      skills: ['TypeScript', 'Node.js'],
    });
  });
});

describe('ContextAdapters', () => {
  it('converts each supported business source to its AI-ready shape', () => {
    expect(new ProfileContextAdapter().adapt({ targetRole: 'Backend', fullName: 'Private Name' }))
      .toEqual({ targetRole: 'Backend' });
    expect(new CareerGoalContextAdapter().adapt({ targetRole: 'Backend', userId: 'user-1' }))
      .toEqual({ targetRole: 'Backend' });
    expect(new DigitalTwinContextAdapter().adapt(
      { skillState: { skills: ['TypeScript'] }, internal: 'omit' },
      { digitalTwinPartitions: ['skillState'] },
    )).toEqual({ skillState: { skills: ['TypeScript'] } });
    expect(new ResumeContextAdapter().adapt({ summary: 'Summary', secureUrl: 'omit' }))
      .toEqual({ summary: 'Summary' });
    expect(new ProjectsContextAdapter().adapt([{ title: 'API', internalId: 'omit' }]))
      .toEqual([{ title: 'API' }]);
    expect(new LearningContextAdapter().adapt({ progress: 60, internal: true })).toEqual({ progress: 60 });
    expect(new AssessmentContextAdapter().adapt({ recentScores: [80], internal: true }))
      .toEqual({ recentScores: [80] });
    expect(new InterviewContextAdapter().adapt({ weakAreas: ['System design'], userId: 'omit' }))
      .toEqual({ weakAreas: ['System design'] });
    expect(new ContextAdapters().adapt('profile', { targetRole: 'Backend', fullName: 'omit' }))
      .toEqual({ targetRole: 'Backend' });
  });
});

describe('ContextBuilder', () => {
  it('builds scoped, serialized, compressed context for AIOrchestrator', async () => {
    const sourceProvider = {
      get: vi.fn(async (source: string) => {
        const sources: Record<string, unknown> = {
          profile: { targetRole: '  Backend   Engineer ', fullName: 'Private Name' },
          careerGoal: { targetRole: 'Backend Engineer', targetCompanies: ['Acme', 'Acme'] },
          digitalTwin: {
            skillState: { skills: ['TypeScript', 'TypeScript'] },
            evidenceState: { assessments: [82] },
            rawHistory: 'must not be included',
          },
          resume: { summary: 'must not be included' },
        };
        return sources[source];
      }),
    };
    const builtRequest = await new ContextBuilder().buildFromProvider(request, sourceProvider);
    const response: AIResponse = {
      success: true,
      provider: 'gemini',
      modelAlias: 'REASONING_MODEL',
      metadata: {
        requestId: request.requestId,
        timestamp: new Date(),
        providerModel: 'gemini-reasoning',
      },
      latencyMs: 1,
      errors: [],
    };
    const provider = {
      name: 'gemini' as const,
      supportsStreaming: false,
      generate: vi.fn().mockResolvedValue(response),
    };
    const factory = {
      getProvider: vi.fn().mockReturnValue(provider),
      resolveModel: vi.fn().mockReturnValue('gemini-reasoning'),
    } as unknown as ProviderFactory;

    await new AIOrchestrator(factory).execute(builtRequest);

    expect(builtRequest.context).toEqual({
      profile: { targetRole: 'Backend Engineer' },
      careerGoal: { targetRole: 'Backend Engineer', targetCompanies: ['Acme'] },
      digitalTwin: {
        skillState: { skills: ['TypeScript'] },
        evidenceState: { assessments: [82] },
      },
    });
    expect(provider.generate).toHaveBeenCalledWith(
      expect.objectContaining({ context: builtRequest.context }),
      'gemini-reasoning',
      'REASONING_MODEL',
    );
    expect(sourceProvider.get).toHaveBeenCalledTimes(3);
    expect(sourceProvider.get).toHaveBeenCalledWith('profile');
    expect(sourceProvider.get).toHaveBeenCalledWith('careerGoal');
    expect(sourceProvider.get).toHaveBeenCalledWith('digitalTwin');
    expect(sourceProvider.get).not.toHaveBeenCalledWith('resume');
  });
});
