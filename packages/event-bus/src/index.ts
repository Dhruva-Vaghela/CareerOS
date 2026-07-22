import { EventEmitter } from 'events';
import { BaseEvent } from '@careeros/shared-types';
import { createLogger } from '@careeros/logger';

const logger = createLogger('event-bus');

export type EventHandler<T extends BaseEvent = BaseEvent> = (event: T) => Promise<void> | void;

export interface IEventBus {
  publish<T extends BaseEvent>(event: T): Promise<void>;
  subscribe<T extends BaseEvent>(eventName: string, handler: EventHandler<T>): Promise<void>;
  unsubscribe<T extends BaseEvent>(eventName: string, handler: EventHandler<T>): Promise<void>;
}

// InMemory implementation for local testing and lightweight pub/sub
export class InMemoryEventBus implements IEventBus {
  private emitter = new EventEmitter();

  constructor() {
    logger.info('In-Memory Event Bus initialized');
    // Increase limit for multiple services subscribing in a monorepo
    this.emitter.setMaxListeners(100);
  }

  public async publish<T extends BaseEvent>(event: T): Promise<void> {
    const { name, metadata } = event;
    logger.debug(
      { eventName: name, eventId: metadata.eventId, traceId: metadata.traceId },
      'Publishing event to in-memory bus',
    );

    // Emitting asynchronously to mimic real-world async message brokers
    setImmediate(() => {
      this.emitter.emit(name, event);
    });
  }

  public async subscribe<T extends BaseEvent>(
    eventName: string,
    handler: EventHandler<T>,
  ): Promise<void> {
    logger.info({ eventName }, 'Subscribing to event');
    this.emitter.on(eventName, handler);
  }

  public async unsubscribe<T extends BaseEvent>(
    eventName: string,
    handler: EventHandler<T>,
  ): Promise<void> {
    logger.info({ eventName }, 'Unsubscribing from event');
    this.emitter.off(eventName, handler);
  }
}

// Idempotency guard structure: keeps track of processed event IDs
export class EventIdempotencyGuard {
  private processedIds = new Set<string>();
  private readonly maxCacheSize = 10000;

  constructor(private readonly name: string) {}

  /**
   * Check if the event has been processed already. If not, mark it as processed.
   * This is thread-safe for standard Node async loops.
   */
  public async checkAndRegister(eventId: string): Promise<boolean> {
    if (this.processedIds.has(eventId)) {
      logger.warn(
        { eventId, guard: this.name },
        'Duplicate event detected by idempotency guard',
      );
      return false; // is duplicate, don't process
    }

    // Cache eviction to prevent memory leak
    if (this.processedIds.size >= this.maxCacheSize) {
      const firstKey = this.processedIds.keys().next().value;
      if (firstKey) this.processedIds.delete(firstKey);
    }

    this.processedIds.add(eventId);
    return true; // first time seeing this, safe to process
  }

  public clear(): void {
    this.processedIds.clear();
  }
}
