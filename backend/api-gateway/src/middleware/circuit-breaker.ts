import { FastifyReply, FastifyRequest } from 'fastify';

interface CircuitBreakerOptions {
  threshold: number;        // Number of failures to open circuit
  timeout: number;          // Time in ms before trying again
  resetTimeout: number;     // Time in ms to reset statistics
  monitoringPeriod: number; // Time window for monitoring failures
}

enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private nextAttempt: number = Date.now();
  private readonly options: CircuitBreakerOptions;
  private readonly serviceName: string;

  constructor(serviceName: string, options?: Partial<CircuitBreakerOptions>) {
    this.serviceName = serviceName;
    this.options = {
      threshold: options?.threshold || 5,
      timeout: options?.timeout || 60000,
      resetTimeout: options?.resetTimeout || 300000,
      monitoringPeriod: options?.monitoringPeriod || 60000
    };

    // Reset statistics periodically
    setInterval(() => {
      this.resetStatistics();
    }, this.options.resetTimeout);
  }

  async execute<T>(request: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        throw new Error(`Circuit breaker is OPEN for service: ${this.serviceName}`);
      }
      this.state = CircuitState.HALF_OPEN;
    }

    try {
      const result = await request();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= 2) {
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
        console.log(`Circuit breaker CLOSED for service: ${this.serviceName}`);
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.options.timeout;
      console.error(`Circuit breaker OPEN for service: ${this.serviceName} (half-open test failed)`);
      return;
    }

    if (this.failureCount >= this.options.threshold) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.options.timeout;
      console.error(`Circuit breaker OPEN for service: ${this.serviceName} (threshold reached: ${this.failureCount})`);
    }
  }

  private resetStatistics(): void {
    const now = Date.now();
    if (now - this.lastFailureTime > this.options.monitoringPeriod) {
      this.failureCount = 0;
      this.successCount = 0;
      if (this.state === CircuitState.OPEN && now >= this.nextAttempt) {
        this.state = CircuitState.HALF_OPEN;
        console.log(`Circuit breaker HALF_OPEN for service: ${this.serviceName} (reset timeout)`);
      }
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getStatistics() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      nextAttempt: this.nextAttempt
    };
  }
}

// Service circuit breakers
const circuitBreakers = new Map<string, CircuitBreaker>();

export function getCircuitBreaker(serviceName: string, options?: Partial<CircuitBreakerOptions>): CircuitBreaker {
  if (!circuitBreakers.has(serviceName)) {
    circuitBreakers.set(serviceName, new CircuitBreaker(serviceName, options));
  }
  return circuitBreakers.get(serviceName)!;
}

// Middleware factory
export function circuitBreakerMiddleware(serviceName: string, options?: Partial<CircuitBreakerOptions>) {
  const breaker = getCircuitBreaker(serviceName, options);

  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Store the circuit breaker in the request for use in the proxy
      (request as any).circuitBreaker = breaker;

      // Check circuit state
      if (breaker.getState() === CircuitState.OPEN) {
        const stats = breaker.getStatistics();
        if (Date.now() < stats.nextAttempt) {
          return reply.status(503).send({
            error: 'Service temporarily unavailable',
            service: serviceName,
            retryAfter: Math.ceil((stats.nextAttempt - Date.now()) / 1000)
          });
        }
      }

      // Continue to next handler
    } catch (error) {
      console.error(`Circuit breaker error for ${serviceName}:`, error);
      return reply.status(503).send({
        error: 'Service unavailable',
        service: serviceName
      });
    }
  };
}

// Health check endpoint for circuit breakers
export function getCircuitBreakerStatus() {
  const status: any = {};
  circuitBreakers.forEach((breaker, name) => {
    status[name] = breaker.getStatistics();
  });
  return status;
}
