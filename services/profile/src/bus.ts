import { InMemoryEventBus, IEventBus } from '@careeros/event-bus';

// In a real production system this might be configured to use RabbitMQ or Redis.
// For MVP, we stick to the provided InMemoryEventBus as per shared package.
export const eventBus: IEventBus = new InMemoryEventBus();
