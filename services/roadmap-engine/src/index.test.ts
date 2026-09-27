import { describe, it, expect } from 'vitest';
import { NodeType, RoadmapStatus } from '@careeros/shared-types';
import { AIGeneratorService, GeneratedRoadmapSchema } from './services/aiGenerator.service.js';

describe('Roadmap Engine Unit Tests', () => {
  const aiGenerator = new AIGeneratorService();

  it('should support all standard node types including MANDATORY, RECOMMENDED, OPTIONAL', () => {
    expect(NodeType.MANDATORY).toBe('MANDATORY');
    expect(NodeType.RECOMMENDED).toBe('RECOMMENDED');
    expect(NodeType.OPTIONAL).toBe('OPTIONAL');
  });

  it('should support RoadmapStatus enums', () => {
    expect(RoadmapStatus.ACTIVE).toBe('ACTIVE');
    expect(RoadmapStatus.ARCHIVED).toBe('ARCHIVED');
    expect(RoadmapStatus.GENERATING).toBe('GENERATING');
  });

  it('should generate valid Full Stack fallback curriculum matching schema', () => {
    const roadmap = aiGenerator.getFallbackRoadmap({
      userId: 'test-user',
      targetRole: 'Full Stack Developer',
    });

    expect(roadmap.targetRole).toBe('Full Stack Developer');
    expect(roadmap.modules.length).toBeGreaterThanOrEqual(3);

    // Schema validation test
    const parseResult = GeneratedRoadmapSchema.safeParse(roadmap);
    expect(parseResult.success).toBe(true);

    // Verify first module is Mandatory
    const firstModule = roadmap.modules[0];
    expect(firstModule.type).toBe(NodeType.MANDATORY);
    expect(firstModule.topics.length).toBeGreaterThanOrEqual(1);

    const firstTopic = firstModule.topics[0];
    expect(firstTopic.subtopics.length).toBeGreaterThanOrEqual(1);

    const firstSubtopic = firstTopic.subtopics[0];
    expect(firstSubtopic.checklistItems.length).toBeGreaterThanOrEqual(1);
    expect(firstSubtopic.checklistItems[0].title).toBeTruthy();
  });

  it('should generate valid Frontend Developer fallback curriculum', () => {
    const roadmap = aiGenerator.getFallbackRoadmap({
      userId: 'test-user-frontend',
      targetRole: 'Frontend Developer',
    });

    expect(roadmap.targetRole).toBe('Frontend Developer');
    const parseResult = GeneratedRoadmapSchema.safeParse(roadmap);
    expect(parseResult.success).toBe(true);
  });

  it('should generate valid Backend Developer fallback curriculum', () => {
    const roadmap = aiGenerator.getFallbackRoadmap({
      userId: 'test-user-backend',
      targetRole: 'Backend Developer',
    });

    expect(roadmap.targetRole).toBe('Backend Developer');
    const parseResult = GeneratedRoadmapSchema.safeParse(roadmap);
    expect(parseResult.success).toBe(true);
  });

  it('should generate valid AI Engineer fallback curriculum', () => {
    const roadmap = aiGenerator.getFallbackRoadmap({
      userId: 'test-user-ai',
      targetRole: 'AI Engineer',
    });

    expect(roadmap.targetRole).toBe('AI Engineer');
    const parseResult = GeneratedRoadmapSchema.safeParse(roadmap);
    expect(parseResult.success).toBe(true);
  });

  it('should reject malformed curriculum output in schema validator', () => {
    const malformed = {
      targetRole: 'DevOps',
      modules: [
        {
          title: 'Too few modules',
          type: 'INVALID_TYPE',
        },
      ],
    };

    const parseResult = GeneratedRoadmapSchema.safeParse(malformed);
    expect(parseResult.success).toBe(false);
  });
});
