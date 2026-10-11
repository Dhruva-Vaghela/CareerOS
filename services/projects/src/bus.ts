import { InMemoryEventBus, IEventBus } from '@careeros/event-bus';

export const eventBus: IEventBus = new InMemoryEventBus();
