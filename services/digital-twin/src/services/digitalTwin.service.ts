import { eq, and } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { digitalTwins, twinNodes, DigitalTwinRow, TwinNodeRow } from '../db/schema.js';
import {
  TwinNode,
  TwinNodeType,
  VerificationStatus,
  ConfidenceLevel,
  CareerDigitalTwin,
} from '@careeros/shared-types';
import { NotFoundError } from '@careeros/errors';
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
    const { db } = getDb();
    const rows = await db
      .select()
      .from(digitalTwins)
      .where(eq(digitalTwins.userId, userId))
      .limit(1);

    if (rows.length > 0) {
      return this.mapTwinToDomain(rows[0]);
    }

    const now = new Date();
    const [inserted] = await db
      .insert(digitalTwins)
      .values({
        userId,
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    logger.info({ userId, twinId: inserted.id }, 'Created new Career Digital Twin');
    return this.mapTwinToDomain(inserted);
  }

  async getAllNodes(userId: string): Promise<TwinNode[]> {
    const twin = await this.getOrCreateTwin(userId);
    const { db } = getDb();

    const rows = await db
      .select()
      .from(twinNodes)
      .where(eq(twinNodes.twinId, twin.id));

    return rows.map((r) => this.mapNodeToDomain(r));
  }

  async getNodeByType(userId: string, nodeType: TwinNodeType): Promise<TwinNode | null> {
    const twin = await this.getOrCreateTwin(userId);
    const { db } = getDb();

    const rows = await db
      .select()
      .from(twinNodes)
      .where(and(eq(twinNodes.twinId, twin.id), eq(twinNodes.nodeType, nodeType)))
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    return this.mapNodeToDomain(rows[0]);
  }

  async upsertNode(userId: string, input: UpsertNodeInput): Promise<TwinNode> {
    const twin = await this.getOrCreateTwin(userId);
    const { db } = getDb();
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

    const existingRows = await db
      .select()
      .from(twinNodes)
      .where(and(eq(twinNodes.twinId, twin.id), eq(twinNodes.nodeType, input.nodeType)))
      .limit(1);

    let row: TwinNodeRow;

    if (existingRows.length > 0) {
      const [updated] = await db
        .update(twinNodes)
        .set({
          source: input.source,
          verificationStatus,
          confidenceScore,
          metadata: input.metadata,
          updatedAt: now,
        })
        .where(eq(twinNodes.id, existingRows[0].id))
        .returning();

      row = updated;
      logger.info({ userId, nodeId: row.id, nodeType: input.nodeType }, 'Updated Twin Node');
    } else {
      const [inserted] = await db
        .insert(twinNodes)
        .values({
          userId,
          twinId: twin.id,
          nodeType: input.nodeType,
          source: input.source,
          verificationStatus,
          confidenceScore,
          metadata: input.metadata,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      row = inserted;
      logger.info({ userId, nodeId: row.id, nodeType: input.nodeType }, 'Created new Twin Node');
    }

    // Touch Digital Twin updatedAt
    await db
      .update(digitalTwins)
      .set({ updatedAt: now })
      .where(eq(digitalTwins.id, twin.id));

    return this.mapNodeToDomain(row);
  }

  async createInitialTwin(userId: string, data: InitialTwinData): Promise<{ twin: CareerDigitalTwin; nodes: TwinNode[] }> {
    const twin = await this.getOrCreateTwin(userId);
    const nodes: TwinNode[] = [];

    // 1. Profile Node
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

    // 2. Career Goal Node
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

    // 3. Timeline Node
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

    // 4. Target Companies Node
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

    // 5. Preferences Node
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

    // 6. Resume Metadata Node (if uploaded) - marked IMPORTED & Confidence MEDIUM
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

    // Explicitly NO Resume Insight Node created during onboarding

    return { twin, nodes };
  }

  private mapTwinToDomain(row: DigitalTwinRow): CareerDigitalTwin {
    return {
      id: row.id,
      userId: row.userId,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapNodeToDomain(row: TwinNodeRow): TwinNode {
    return {
      id: row.id,
      userId: row.userId,
      twinId: row.twinId,
      nodeType: row.nodeType as TwinNodeType,
      source: row.source,
      verificationStatus: row.verificationStatus as VerificationStatus,
      confidenceScore: row.confidenceScore as ConfidenceLevel,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      metadata: row.metadata as Record<string, unknown>,
    };
  }
}
