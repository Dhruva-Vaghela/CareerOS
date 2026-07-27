import {
  DigitalTwinModel,
  TwinNodeModel,
  IDigitalTwinDocument,
  ITwinNodeDocument,
} from '../db/schema.js';
import {
  TwinNode,
  TwinNodeType,
  VerificationStatus,
  ConfidenceLevel,
  CareerDigitalTwin,
} from '@careeros/shared-types';
import { createLogger } from '@careeros/logger';

const logger = createLogger('digital-twin-service');

export interface UpsertNodeInput {
  nodeType: TwinNodeType;
  source: string;
  verificationStatus?: VerificationStatus;
  confidenceScore?: ConfidenceLevel;
  metadata: Record<string, unknown>;
}

export interface InitialTwinData {
  profile?: {
    fullName?: string;
    college?: string;
    degree?: string;
    branch?: string;
    graduationYear?: number;
  };
  goal?: {
    targetRole: string;
  };
  timeline?: {
    timeline: string;
    customTimeline?: string;
  };
  targetCompanies?: {
    companies: string[];
  };
  preferences?: {
    interests?: string[];
    preferredLanguage?: string;
  };
  resumeMetadata?: {
    filename: string;
    secureUrl: string;
    publicId: string;
    size: number;
    uploadDate: Date | string;
  };
}

export class DigitalTwinService {
  async getOrCreateTwin(userId: string): Promise<CareerDigitalTwin> {
    let twinDoc = await DigitalTwinModel.findOne({ userId });

    if (!twinDoc) {
      const now = new Date();
      twinDoc = await DigitalTwinModel.create({
        userId,
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
      });
      logger.info({ userId, twinId: twinDoc.id }, 'Created new Career Digital Twin');
    }

    return this.mapTwinToDomain(twinDoc);
  }

  async getAllNodes(userId: string): Promise<TwinNode[]> {
    const twin = await this.getOrCreateTwin(userId);
    const nodeDocs = await TwinNodeModel.find({ twinId: twin.id });
    return nodeDocs.map((doc) => this.mapNodeToDomain(doc));
  }

  async getNodeByType(userId: string, nodeType: TwinNodeType): Promise<TwinNode | null> {
    const twin = await this.getOrCreateTwin(userId);
    const doc = await TwinNodeModel.findOne({ twinId: twin.id, nodeType });
    if (!doc) {
      return null;
    }
    return this.mapNodeToDomain(doc);
  }

  async upsertNode(userId: string, input: UpsertNodeInput): Promise<TwinNode> {
    const twin = await this.getOrCreateTwin(userId);
    const now = new Date();

    const verificationStatus =
      input.verificationStatus ||
      (input.nodeType === TwinNodeType.ASSESSMENT
        ? VerificationStatus.VERIFIED
        : input.nodeType === TwinNodeType.RESUME_METADATA
          ? VerificationStatus.IMPORTED
          : VerificationStatus.UNVERIFIED);

    const confidenceScore =
      input.confidenceScore ||
      (verificationStatus === VerificationStatus.VERIFIED
        ? ConfidenceLevel.HIGH
        : verificationStatus === VerificationStatus.IMPORTED
          ? ConfidenceLevel.MEDIUM
          : ConfidenceLevel.LOW);

    const nodeDoc = await TwinNodeModel.findOneAndUpdate(
      { twinId: twin.id, nodeType: input.nodeType },
      {
        $set: {
          userId,
          source: input.source,
          verificationStatus,
          confidenceScore,
          metadata: input.metadata,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true, new: true, runValidators: true },
    );

    if (!nodeDoc) {
      throw new Error('Failed to upsert twin node document');
    }

    await DigitalTwinModel.updateOne({ _id: twin.id }, { $set: { updatedAt: now } });
    logger.info({ userId, nodeId: nodeDoc.id, nodeType: input.nodeType }, 'Upserted Twin Node');

    return this.mapNodeToDomain(nodeDoc);
  }

  async createInitialTwin(userId: string, data: InitialTwinData): Promise<{ twin: CareerDigitalTwin; nodes: TwinNode[] }> {
    const twin = await this.getOrCreateTwin(userId);
    const nodes: TwinNode[] = [];

    if (data.profile) {
      const profileNode = await this.upsertNode(userId, {
        nodeType: TwinNodeType.PROFILE,
        source: 'PROFILE_SERVICE',
        verificationStatus: VerificationStatus.UNVERIFIED,
        confidenceScore: ConfidenceLevel.LOW,
        metadata: data.profile as Record<string, unknown>,
      });
      nodes.push(profileNode);
    }

    if (data.goal) {
      const goalNode = await this.upsertNode(userId, {
        nodeType: TwinNodeType.GOAL,
        source: 'CAREER_GOAL_SERVICE',
        verificationStatus: VerificationStatus.UNVERIFIED,
        confidenceScore: ConfidenceLevel.LOW,
        metadata: data.goal as Record<string, unknown>,
      });
      nodes.push(goalNode);
    }

    if (data.timeline) {
      const timelineNode = await this.upsertNode(userId, {
        nodeType: TwinNodeType.TIMELINE,
        source: 'CAREER_GOAL_SERVICE',
        verificationStatus: VerificationStatus.UNVERIFIED,
        confidenceScore: ConfidenceLevel.LOW,
        metadata: data.timeline as Record<string, unknown>,
      });
      nodes.push(timelineNode);
    }

    if (data.targetCompanies && data.targetCompanies.companies.length > 0) {
      const targetCompanyNode = await this.upsertNode(userId, {
        nodeType: TwinNodeType.TARGET_COMPANY,
        source: 'CAREER_GOAL_SERVICE',
        verificationStatus: VerificationStatus.UNVERIFIED,
        confidenceScore: ConfidenceLevel.LOW,
        metadata: data.targetCompanies as Record<string, unknown>,
      });
      nodes.push(targetCompanyNode);
    }

    if (data.preferences) {
      const prefNode = await this.upsertNode(userId, {
        nodeType: TwinNodeType.PREFERENCE,
        source: 'PROFILE_SERVICE',
        verificationStatus: VerificationStatus.UNVERIFIED,
        confidenceScore: ConfidenceLevel.LOW,
        metadata: data.preferences as Record<string, unknown>,
      });
      nodes.push(prefNode);
    }

    if (data.resumeMetadata) {
      const resumeNode = await this.upsertNode(userId, {
        nodeType: TwinNodeType.RESUME_METADATA,
        source: 'RESUME_SERVICE',
        verificationStatus: VerificationStatus.IMPORTED,
        confidenceScore: ConfidenceLevel.MEDIUM,
        metadata: data.resumeMetadata as Record<string, unknown>,
      });
      nodes.push(resumeNode);
    }

    return { twin, nodes };
  }

  private mapTwinToDomain(doc: IDigitalTwinDocument): CareerDigitalTwin {
    return {
      id: doc.id || doc._id.toHexString(),
      userId: doc.userId,
      status: doc.status,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  private mapNodeToDomain(doc: ITwinNodeDocument): TwinNode {
    return {
      id: doc.id || doc._id.toHexString(),
      userId: doc.userId,
      twinId: doc.twinId,
      nodeType: doc.nodeType as TwinNodeType,
      source: doc.source,
      verificationStatus: doc.verificationStatus as VerificationStatus,
      confidenceScore: doc.confidenceScore as ConfidenceLevel,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      metadata: (doc.metadata as Record<string, unknown>) || {},
    };
  }
}
