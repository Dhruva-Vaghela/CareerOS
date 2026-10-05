import { createEventBus, type EventBus } from '@careeros/event-bus';

let busInstance: EventBus | null = null;

export function getEventBus(): EventBus {
  if (!busInstance) {
    busInstance = createEventBus({ serviceName: 'assessment' });
  }
  return busInstance;
}