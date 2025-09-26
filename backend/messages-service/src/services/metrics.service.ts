import { config } from '@/utils/config';
import { logger } from '@/utils/logger';
import { Counter, Gauge, Histogram, collectDefaultMetrics, register } from 'prom-client';

export class MetricsService {
  private counters: Map<string, Counter> = new Map();
  private histograms: Map<string, Histogram> = new Map();
  private gauges: Map<string, Gauge> = new Map();

  constructor() {
    if (config.METRICS_ENABLED) {
      this.initializeMetrics();
    }
  }

  private initializeMetrics(): void {
    // Enable default metrics collection
    collectDefaultMetrics({
      register,
      prefix: 'messages_service_',
    });

    // Business metrics
    this.createCounter('messages_created_total', 'Total messages created');
    this.createCounter('messages_sent_total', 'Total messages sent successfully');
    this.createCounter('messages_failed_total', 'Total messages failed');
    this.createCounter('messages_queued_total', 'Total messages queued');
    this.createCounter('messages_retried_total', 'Total messages retried');

    // Email metrics
    this.createCounter('emails_sent_total', 'Total emails sent');
    this.createCounter('emails_failed_total', 'Total emails failed');
    this.createCounter('custom_emails_sent_total', 'Total custom emails sent');
    this.createCounter('custom_emails_failed_total', 'Total custom emails failed');

    // Circuit breaker metrics
    this.createCounter('email_circuit_breaker_open_total', 'Email circuit breaker opened');
    this.createCounter('email_circuit_breaker_close_total', 'Email circuit breaker closed');
    this.createCounter('email_circuit_breaker_half_open_total', 'Email circuit breaker half-opened');

    // Cache metrics
    this.createCounter('messages_cache_hits_total', 'Total message cache hits');
    this.createCounter('messages_cache_misses_total', 'Total message cache misses');
    this.createCounter('message_stats_cache_hits_total', 'Total message stats cache hits');
    this.createCounter('message_stats_cache_misses_total', 'Total message stats cache misses');

    // Error metrics
    this.createCounter('messages_creation_errors_total', 'Total message creation errors');
    this.createCounter('messages_not_found_total', 'Total message not found errors');
    this.createCounter('messages_cleaned_total', 'Total messages cleaned up');

    // Performance histograms
    this.createHistogram('message_creation_duration_ms', 'Message creation duration in milliseconds', [10, 50, 100, 500, 1000, 5000]);
    this.createHistogram('email_send_duration_ms', 'Email send duration in milliseconds', [100, 500, 1000, 5000, 10000, 30000]);
    this.createHistogram('http_request_duration_ms', 'HTTP request duration in milliseconds', [10, 50, 100, 500, 1000, 5000]);
    this.createHistogram('database_query_duration_ms', 'Database query duration in milliseconds', [1, 10, 50, 100, 500, 1000]);

    // System gauges
    this.createGauge('messages_in_queue', 'Number of messages in queue');
    this.createGauge('active_database_connections', 'Number of active database connections');
    this.createGauge('email_circuit_breaker_state', 'Email circuit breaker state (0=closed, 1=open, 2=half-open)');

    logger.info('Metrics service initialized', {
      counters: this.counters.size,
      histograms: this.histograms.size,
      gauges: this.gauges.size,
    });
  }

  private createCounter(name: string, help: string, labelNames?: string[]): Counter {
    const counter = new Counter({
      name: `messages_service_${name}`,
      help,
      labelNames: labelNames || [],
      registers: [register],
    });
    this.counters.set(name, counter);
    return counter;
  }

  private createHistogram(name: string, help: string, buckets?: number[], labelNames?: string[]): Histogram {
    const histogram = new Histogram({
      name: `messages_service_${name}`,
      help,
      buckets,
      labelNames: labelNames || [],
      registers: [register],
    });
    this.histograms.set(name, histogram);
    return histogram;
  }

  private createGauge(name: string, help: string, labelNames?: string[]): Gauge {
    const gauge = new Gauge({
      name: `messages_service_${name}`,
      help,
      labelNames: labelNames || [],
      registers: [register],
    });
    this.gauges.set(name, gauge);
    return gauge;
  }

  // Public methods for incrementing counters
  incrementCounter(name: string, value = 1, labels?: Record<string, string>): void {
    if (!config.METRICS_ENABLED) return;
    
    const counter = this.counters.get(name);
    if (counter) {
      if (labels) {
        counter.inc(labels, value);
      } else {
        counter.inc(value);
      }
    }
  }

  // Public methods for recording histograms
  recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
    if (!config.METRICS_ENABLED) return;
    
    const histogram = this.histograms.get(name);
    if (histogram) {
      if (labels) {
        histogram.observe(labels, value);
      } else {
        histogram.observe(value);
      }
    }
  }

  // Public methods for setting gauges
  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    if (!config.METRICS_ENABLED) return;
    
    const gauge = this.gauges.get(name);
    if (gauge) {
      if (labels) {
        gauge.set(labels, value);
      } else {
        gauge.set(value);
      }
    }
  }

  incrementGauge(name: string, value = 1, labels?: Record<string, string>): void {
    if (!config.METRICS_ENABLED) return;
    
    const gauge = this.gauges.get(name);
    if (gauge) {
      if (labels) {
        gauge.inc(labels, value);
      } else {
        gauge.inc(value);
      }
    }
  }

  decrementGauge(name: string, value = 1, labels?: Record<string, string>): void {
    if (!config.METRICS_ENABLED) return;
    
    const gauge = this.gauges.get(name);
    if (gauge) {
      if (labels) {
        gauge.dec(labels, value);
      } else {
        gauge.dec(value);
      }
    }
  }

  // Get metrics in Prometheus format
  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  // Clear all metrics
  clearMetrics(): void {
    register.clear();
    this.counters.clear();
    this.histograms.clear();
    this.gauges.clear();
  }

  // Get registry for external use
  getRegister() {
    return register;
  }
}
