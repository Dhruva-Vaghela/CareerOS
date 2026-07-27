import { createEventBus, EventBus } from '@careeros/event-bus';
import { DigitalTwinService } from './services/digitalTwin.service.js';
import {
  ProfileUpdatedEvent,
  GoalChangedEvent,
  GoalCreatedEvent,
  PreferencesUpdatedEvent,
  TwinNodeType,
  VerificationStatus,
  ConfidenceLevel,
} from '@careeros/shared-types';
import { createLogger } from '@careeros/logger';

const logger = createLogger('digital-twin-event-bus');
let busInstance: EventBus | null = null;
const twinService = new DigitalTwinService();

export function setupEventSubscriptions(): EventBus {
  if (!busInstance) {
    busInstance = createEventBus({ serviceName: 'digital-twin' });

    // 1. Subscribe to profile.updated
    busInstance.subscribe<ProfileUpdatedEvent>('profile.updated', async (event) => {
      try {
        const { userId, profile } = event.payload;
        logger.info({ userId }, 'Digital Twin handling profile.updated event');

        await twinService.upsertNode(userId, {
          nodeType: TwinNodeType.PROFILE,
          source: 'PROFILE_SERVICE',
          verificationStatus: VerificationStatus.UNVERIFIED,
          confidenceScore: ConfidenceLevel.LOW,
          metadata: profile as Record<string, unknown>,
        });
      } catch (err) {
        logger.error({ err }, 'Error processing profile.updated in Digital Twin');
      }
    });

    // 2. Subscribe to career.goal.updated
    busInstance.subscribe<{ userId: string; goal: Record<string, unknown> }>('career.goal.updated', async (event) => {
      try {
        const { userId, goal } = event.payload;
        logger.info({ userId }, 'Digital Twin handling career.goal.updated event');

        await twinService.upsertNode(userId, {
          nodeType: TwinNodeType.GOAL,
          source: 'CAREER_GOAL_SERVICE',
          verificationStatus: VerificationStatus.UNVERIFIED,
          confidenceScore: ConfidenceLevel.LOW,
          metadata: goal,
        });
      } catch (err) {
        logger.error({ err }, 'Error processing career.goal.updated in Digital Twin');
      }
    });

    // 3. Subscribe to goal.created / goal.changed
    busInstance.subscribe<GoalCreatedEvent>('goal.created', async (event) => {
      try {
        const { userId, goal } = event.payload;
        await twinService.upsertNode(userId, {
          nodeType: TwinNodeType.GOAL,
          source: 'CAREER_GOAL_SERVICE',
          verificationStatus: VerificationStatus.UNVERIFIED,
          confidenceScore: ConfidenceLevel.LOW,
          metadata: goal as unknown as Record<string, unknown>,
        });
      } catch (err) {
        logger.error({ err }, 'Error processing goal.created in Digital Twin');
      }
    });

    busInstance.subscribe<GoalChangedEvent>('goal.changed', async (event) => {
      try {
        const { userId, newGoal } = event.payload;
        await twinService.upsertNode(userId, {
          nodeType: TwinNodeType.GOAL,
          source: 'CAREER_GOAL_SERVICE',
          verificationStatus: VerificationStatus.UNVERIFIED,
          confidenceScore: ConfidenceLevel.LOW,
          metadata: newGoal as unknown as Record<string, unknown>,
        });
      } catch (err) {
        logger.error({ err }, 'Error processing goal.changed in Digital Twin');
      }
    });

    // 4. Subscribe to preferences.updated
    busInstance.subscribe<PreferencesUpdatedEvent>('preferences.updated', async (event) => {
      try {
        const { userId, preferences } = event.payload;
        logger.info({ userId }, 'Digital Twin handling preferences.updated event');

        await twinService.upsertNode(userId, {
          nodeType: TwinNodeType.PREFERENCE,
          source: 'PROFILE_SERVICE',
          verificationStatus: VerificationStatus.UNVERIFIED,
          confidenceScore: ConfidenceLevel.LOW,
          metadata: preferences,
        });
      } catch (err) {
        logger.error({ err }, 'Error processing preferences.updated in Digital Twin');
      }
    });
  }

  return busInstance;
}
