import { DigitalTwinService } from './digitalTwin.service.js';
import {
  ContextFeature,
  ContextQuery,
  ScopedContextPayload,
  TwinNode,
  TwinNodeType,
} from '@careeros/shared-types';
import { createLogger } from '@careeros/logger';

const logger = createLogger('context-builder-service');

const FEATURE_NODE_MAP: Record<ContextFeature, TwinNodeType[]> = {
  Roadmap: [
    TwinNodeType.GOAL,
    TwinNodeType.TIMELINE,
    TwinNodeType.SKILL,
    TwinNodeType.PROFILE,
    TwinNodeType.LEARNING,
    TwinNodeType.EDUCATION,
  ],
  Goal: [
    TwinNodeType.GOAL,
    TwinNodeType.TIMELINE,
    TwinNodeType.TARGET_COMPANY,
    TwinNodeType.PROFILE,
  ],
  Timeline: [TwinNodeType.TIMELINE, TwinNodeType.GOAL],
  Skills: [
    TwinNodeType.SKILL,
    TwinNodeType.ASSESSMENT,
    TwinNodeType.CERTIFICATION,
    TwinNodeType.EDUCATION,
  ],
  Learning: [
    TwinNodeType.LEARNING,
    TwinNodeType.SKILL,
    TwinNodeType.ASSESSMENT,
    TwinNodeType.GOAL,
  ],
  Interview: [
    TwinNodeType.SKILL,
    TwinNodeType.ASSESSMENT,
    TwinNodeType.INTERVIEW,
    TwinNodeType.LEARNING,
    TwinNodeType.GOAL,
    TwinNodeType.EXPERIENCE,
  ],
  Assessment: [
    TwinNodeType.SKILL,
    TwinNodeType.ASSESSMENT,
    TwinNodeType.LEARNING,
  ],
  Recommendation: [
    TwinNodeType.READINESS,
    TwinNodeType.GOAL,
    TwinNodeType.TIMELINE,
    TwinNodeType.SKILL,
    TwinNodeType.RECOMMENDATION,
    TwinNodeType.LEARNING,
  ],
  Profile: [
    TwinNodeType.PROFILE,
    TwinNodeType.EDUCATION,
    TwinNodeType.EXPERIENCE,
    TwinNodeType.PREFERENCE,
  ],
  Resume: [
    TwinNodeType.RESUME_METADATA,
    TwinNodeType.RESUME_INSIGHT,
    TwinNodeType.EXPERIENCE,
    TwinNodeType.EDUCATION,
    TwinNodeType.SKILL,
  ],
};

export class ContextBuilderService {
  private twinService = new DigitalTwinService();

  async buildContext(query: ContextQuery): Promise<ScopedContextPayload> {
    const { userId, features } = query;

    // Collect unique node types required for requested features
    const requiredNodeTypesSet = new Set<TwinNodeType>();

    for (const feature of features) {
      const nodeTypes = FEATURE_NODE_MAP[feature];
      if (nodeTypes) {
        nodeTypes.forEach((nt) => requiredNodeTypesSet.add(nt));
      }
    }

    const allNodes = await this.twinService.getAllNodes(userId);

    // Filter nodes selectively
    const scopedNodes: TwinNode[] = allNodes.filter((node) =>
      requiredNodeTypesSet.has(node.nodeType),
    );

    logger.info(
      { userId, features, matchedNodesCount: scopedNodes.length },
      'Assembled selective AI context',
    );

    return {
      userId,
      nodes: scopedNodes,
      timestamp: new Date(),
    };
  }
}
