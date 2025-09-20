import { IEventBus } from '../../interfaces';
import { serviceLogger } from '../../utils/logger';

type EventHandler = (data: any) => Promise<void>;

export class LocalEventBus implements IEventBus {
  private handlers: Map<string, EventHandler[]> = new Map();

  async publish(event: string, data: any): Promise<void> {
    try {
      const handlers = this.handlers.get(event) || [];
      
      if (handlers.length === 0) {
        serviceLogger.debug({ event, data }, 'No handlers registered for event');
        return;
      }

      serviceLogger.info({ event, handlerCount: handlers.length }, 'Publishing event');

      // Execute handlers in parallel
      const promises = handlers.map(async (handler, index) => {
        try {
          await handler(data);
          serviceLogger.debug({ event, handlerIndex: index }, 'Event handler executed successfully');
        } catch (error) {
          serviceLogger.error({ 
            error, 
            event, 
            handlerIndex: index 
          }, 'Event handler failed');
        }
      });

      await Promise.all(promises);
      
      serviceLogger.info({ event, handlerCount: handlers.length }, 'Event published successfully');
    } catch (error) {
      serviceLogger.error({ error, event, data }, 'Failed to publish event');
      throw error;
    }
  }

  subscribe(event: string, handler: EventHandler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    
    this.handlers.get(event)!.push(handler);
    
    serviceLogger.info({ event, totalHandlers: this.handlers.get(event)!.length }, 'Event handler subscribed');
  }

  unsubscribe(event: string, handler: EventHandler): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
        serviceLogger.info({ event, remainingHandlers: handlers.length }, 'Event handler unsubscribed');
      }
    }
  }

  getHandlerCount(event: string): number {
    return this.handlers.get(event)?.length || 0;
  }

  getRegisteredEvents(): string[] {
    return Array.from(this.handlers.keys());
  }

  // Utility method for testing
  clear(): void {
    this.handlers.clear();
    serviceLogger.info('Event bus cleared');
  }
}
