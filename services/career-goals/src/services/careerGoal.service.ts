import { eq, and } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { careerGoals, CareerGoalRow } from '../db/schema.js';
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
    const { db } = getDb();
    const rows = await db
      .select()
      .from(careerGoals)
      .where(
        and(
          eq(careerGoals.userId, userId),
          eq(careerGoals.status, CareerGoalStatus.ACTIVE),
        ),
      )
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    return this.mapToDomain(rows[0]);
  }

  async upsertGoal(userId: string, input: UpsertGoalInput): Promise<CareerGoal> {
    const { db } = getDb();
    const existing = await this.getActiveGoal(userId);

    const targetCompanies = input.targetCompanies || [];
    const now = new Date();

    let row: CareerGoalRow;

    if (existing) {
      const [updated] = await db
        .update(careerGoals)
        .set({
          targetRole: input.targetRole,
          targetCompanies: targetCompanies,
          timeline: input.timeline,
          customTimeline: input.customTimeline || null,
          updatedAt: now,
        })
        .where(eq(careerGoals.id, existing.id))
        .returning();

      row = updated;
      logger.info({ userId, goalId: row.id }, 'Updated career goal');
    } else {
      const [inserted] = await db
        .insert(careerGoals)
        .values({
          userId,
          targetRole: input.targetRole,
          targetCompanies: targetCompanies,
          timeline: input.timeline,
          customTimeline: input.customTimeline || null,
          status: CareerGoalStatus.ACTIVE,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      row = inserted;
      logger.info({ userId, goalId: row.id }, 'Created new career goal');
    }

    const domainGoal = this.mapToDomain(row);

    // Publish domain event
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

  private mapToDomain(row: CareerGoalRow): CareerGoal {
    return {
      id: row.id,
      userId: row.userId,
      targetRole: row.targetRole,
      targetCompanies: row.targetCompanies || [],
      targetTimeline: row.timeline,
      customTimeline: row.customTimeline || undefined,
      status: row.status as CareerGoalStatus,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
