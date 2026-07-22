import { BaseEvent } from '@careeros/shared-types';
export type EventHandler<T extends BaseEvent = BaseEvent> = (event: T) => Promise<void> | void;
export interface IEventBus {
    publish<T extends BaseEvent>(event: T): Promise<void>;
    subscribe<T extends BaseEvent>(eventName: string, handler: EventHandler<T>): Promise<void>;
    unsubscribe<T extends BaseEvent>(eventName: string, handler: EventHandler<T>): Promise<void>;
}
export declare class InMemoryEventBus implements IEventBus {
    private emitter;
    constructor();
    publish<T extends BaseEvent>(event: T): Promise<void>;
    subscribe<T extends BaseEvent>(eventName: string, handler: EventHandler<T>): Promise<void>;
    unsubscribe<T extends BaseEvent>(eventName: string, handler: EventHandler<T>): Promise<void>;
}
export declare class EventIdempotencyGuard {
    private readonly name;
    private processedIds;
    private readonly maxCacheSize;
    constructor(name: string);
    /**
     * Check if the event has been processed already. If not, mark it as processed.
     * This is thread-safe for standard Node async loops.
     */
    checkAndRegister(eventId: string): Promise<boolean>;
    clear(): void;
}
//# sourceMappingURL=index.d.ts.map