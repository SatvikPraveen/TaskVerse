// apps/api/src/events/bootstrap.ts
import { registerActivitySubscriber } from '@/modules/activity/activity.subscriber';
import { registerSocketBridge } from '@/sockets/bridge';

let registered = false;

/** Wires every subscriber exactly once per process. */
export const registerEventSubscribers = (): void => {
  if (registered) return;
  registered = true;
  registerActivitySubscriber();
  registerSocketBridge();
};
