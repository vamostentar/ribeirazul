import { logger } from '@/utils/logger';
import CircuitBreaker from 'opossum';

export interface CircuitBreakerOptions {
  timeout?: number;
  errorThresholdPercentage?: number;
  resetTimeout?: number;
  onOpen?: () => void;
  onHalfOpen?: () => void;
  onClose?: () => void;
}

export class CircuitBreakerService {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  createCircuitBreaker<T extends any[], R>(
    name: string,
    action: (...args: T) => Promise<R>,
    options: CircuitBreakerOptions = {}
  ): CircuitBreaker {
    const circuitBreaker = new CircuitBreaker(action, {
      timeout: options.timeout || 10000,
      errorThresholdPercentage: options.errorThresholdPercentage || 50,
      resetTimeout: options.resetTimeout || 30000,
      rollingCountTimeout: 10000,
      rollingCountBuckets: 10,
      name,
    });

    // Event listeners
    circuitBreaker.on('open', () => {
      logger.warn(`Circuit breaker opened for ${name}`);
      options.onOpen?.();
    });

    circuitBreaker.on('halfOpen', () => {
      logger.info(`Circuit breaker half-opened for ${name}`);
      options.onHalfOpen?.();
    });

    circuitBreaker.on('close', () => {
      logger.info(`Circuit breaker closed for ${name}`);
      options.onClose?.();
    });

    circuitBreaker.on('failure', (error) => {
      logger.error(`Circuit breaker failure for ${name}`, {
        error: error.message,
        stats: circuitBreaker.stats,
      });
    });

    circuitBreaker.on('success', () => {
      logger.debug(`Circuit breaker success for ${name}`, {
        stats: circuitBreaker.stats,
      });
    });

    circuitBreaker.on('timeout', () => {
      logger.warn(`Circuit breaker timeout for ${name}`, {
        stats: circuitBreaker.stats,
      });
    });

    circuitBreaker.on('reject', () => {
      logger.warn(`Circuit breaker rejected request for ${name}`, {
        stats: circuitBreaker.stats,
      });
    });

    this.circuitBreakers.set(name, circuitBreaker);
    return circuitBreaker;
  }

  getCircuitBreaker(name: string): CircuitBreaker | undefined {
    return this.circuitBreakers.get(name);
  }

  getAllCircuitBreakers(): Map<string, CircuitBreaker> {
    return this.circuitBreakers;
  }

  getStats(name?: string): any {
    if (name) {
      const breaker = this.circuitBreakers.get(name);
      return breaker ? {
        name,
        state: breaker.opened ? 'open' : breaker.halfOpen ? 'half-open' : 'closed',
        stats: breaker.stats,
      } : null;
    }

    const allStats: any = {};
    for (const [breakerName, breaker] of this.circuitBreakers) {
      allStats[breakerName] = {
        state: breaker.opened ? 'open' : breaker.halfOpen ? 'half-open' : 'closed',
        stats: breaker.stats,
      };
    }
    return allStats;
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down circuit breakers');
    
    for (const [name, breaker] of this.circuitBreakers) {
      try {
        breaker.shutdown();
        logger.debug(`Circuit breaker ${name} shut down`);
      } catch (error: any) {
        logger.error(`Error shutting down circuit breaker ${name}`, {
          error: error.message,
        });
      }
    }
    
    this.circuitBreakers.clear();
  }
}
