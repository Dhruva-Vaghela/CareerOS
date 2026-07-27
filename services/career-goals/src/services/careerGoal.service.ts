import { CareerGoalModel, ICareerGoalDocument } from '../db/schema.js';
import { CareerGoalStatus, CareerGoal } from '@careeros/shared-types';
import { getEventBus } from '../bus.js';
import { createLogger } from '@careeros/logger';

const logger = createLogger('career-goal-service');

export interface UpsertGoalInput {
  targetRole: string;
  targetCompanies?: string[];
  timeline: string;
  customTimeline?: string;
}

export class CareerGoalService {
  async getActiveGoal(userId: string): Promise<CareerGoal | null> {
    const doc = await CareerGoalModel.findOne({
      userId,
      status: CareerGoalStatus.ACTIVE,
    });

    if (!doc) {
      return null;
    }

    return this.mapToDomain(doc);
  }

  async upsertGoal(userId: string, input: UpsertGoalInput): Promise<CareerGoal> {
    const targetCompanies = input.targetCompanies || [];
    const now = new Date();

    const doc = await CareerGoalModel.findOneAndUpdate(
      { userId, status: CareerGoalStatus.ACTIVE },
      {
        $set: {
          targetRole: input.targetRole,
          targetCompanies,
          timeline: input.timeline,
          customTimeline: input.customTimeline || null,
          updatedAt: now,
        },
        $setOnInsert: {
          userId,
          status: CareerGoalStatus.ACTIVE,
          createdAt: now,
        },
      },
      { upsert: true, new: true, runValidators: true },
    );

    if (!doc) {
      throw new Error('Failed to upsert career goal document');
    }

    const domainGoal = this.mapToDomain(doc);
    logger.info({ userId, goalId: domainGoal.id }, 'Upserted career goal');

    try {
      const bus = getEventBus();
      await bus.publish({
        name: 'career.goal.updated',
        metadata: {
          eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          timestamp: new Date().toISOString(),
          traceId: `trace_${Date.now()}`,
          userId,
        },
        payload: {
          userId,
          goal: domainGoal,
        },
      });
    } catch (err) {
      logger.error({ err, userId }, 'Failed to publish career.goal.updated event');
    }

    return domainGoal;
  }

  private mapToDomain(doc: ICareerGoalDocument): CareerGoal {
    return {
      id: doc.id || doc._id.toHexString(),
      userId: doc.userId,
      targetRole: doc.targetRole,
      targetCompanies: doc.targetCompanies || [],
      targetTimeline: doc.timeline,
      customTimeline: doc.customTimeline || undefined,
      status: doc.status as CareerGoalStatus,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
