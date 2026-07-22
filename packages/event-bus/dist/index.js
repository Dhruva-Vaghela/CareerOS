import { EventEmitter } from 'events';
import { createLogger } from '@careeros/logger';
const logger = createLogger('event-bus');
// InMemory implementation for local testing and lightweight pub/sub
export class InMemoryEventBus {
    emitter = new EventEmitter();
    constructor() {
        logger.info('In-Memory Event Bus initialized');
        // Increase limit for multiple services subscribing in a monorepo
        this.emitter.setMaxListeners(100);
    }
    async publish(event) {
        const { name, metadata } = event;
        logger.debug({ eventName: name, eventId: metadata.eventId, traceId: metadata.traceId }, 'Publishing event to in-memory bus');
        // Emitting asynchronously to mimic real-world async message brokers
        setImmediate(() => {
            this.emitter.emit(name, event);
        });
    }
    async subscribe(eventName, handler) {
        logger.info({ eventName }, 'Subscribing to event');
        this.emitter.on(eventName, handler);
    }
    async unsubscribe(eventName, handler) {
        logger.info({ eventName }, 'Unsubscribing from event');
        this.emitter.off(eventName, handler);
    }
}
// Idempotency guard structure: keeps track of processed event IDs
export class EventIdempotencyGuard {
    name;
    processedIds = new Set();
    maxCacheSize = 10000;
    constructor(name) {
        this.name = name;
    }
    /**
     * Check if the event has been processed already. If not, mark it as processed.
     * This is thread-safe for standard Node async loops.
     */
    async checkAndRegister(eventId) {
        if (this.processedIds.has(eventId)) {
            logger.warn({ eventId, guard: this.name }, 'Duplicate event detected by idempotency guard');
            return false; // is duplicate, don't process
        }
        // Cache eviction to prevent memory leak
        if (this.processedIds.size >= this.maxCacheSize) {
            const firstKey = this.processedIds.keys().next().value;
            if (firstKey)
                this.processedIds.delete(firstKey);
        }
        this.processedIds.add(eventId);
        return true; // first time seeing this, safe to process
    }
    clear() {
        this.processedIds.clear();
    }
}
//# sourceMappingURL=index.js.map