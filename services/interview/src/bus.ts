import { createEventBus, EventBus } from '@careeros/event-bus';

let busInstance: EventBus | null = null;

export function getEventBus(): EventBus {
  if (!busInstance) {
    busInstance = createEventBus({ serviceName: 'interview-service' });
  }
  return busInstance;
}
