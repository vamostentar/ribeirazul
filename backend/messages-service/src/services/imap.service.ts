import { config } from '@/utils/config';
import { createLogger } from '@/utils/logger';
import { PrismaClient } from '@prisma/client';
import { ImapFlow } from 'imapflow';
import { CircuitBreakerService } from './circuit-breaker.service';
import { MetricsService } from './metrics.service';

export class ImapService {
  private client?: ImapFlow;
  private isRunning = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private pollInterval?: NodeJS.Timeout;
  private logger = createLogger({ service: 'ImapService' });
  private circuitBreaker: any;

  constructor(
    private prisma: PrismaClient,
    private metricsService: MetricsService,
    private circuitBreakerService: CircuitBreakerService
  ) {
    this.initializeCircuitBreaker();
  }

  private initializeCircuitBreaker(): void {
    this.circuitBreaker = this.circuitBreakerService.createCircuitBreaker(
      'imap-service',
      this.connectAndPoll.bind(this),
      {
        timeout: 30000,
        errorThresholdPercentage: 70,
        resetTimeout: 60000,
        onOpen: () => {
          this.logger.circuitBreaker('imap-service', 'open');
          this.metricsService.incrementCounter('imap_circuit_breaker_open_total');
        },
        onHalfOpen: () => {
          this.logger.circuitBreaker('imap-service', 'half-open');
          this.metricsService.incrementCounter('imap_circuit_breaker_half_open_total');
        },
        onClose: () => {
          this.logger.circuitBreaker('imap-service', 'closed');
          this.metricsService.incrementCounter('imap_circuit_breaker_close_total');
        },
      }
    );
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('IMAP service is already running');
      return;
    }

    this.isRunning = true;
    this.logger.info('Starting IMAP service', {
      host: config.IMAP_HOST,
      port: config.IMAP_PORT,
      secure: config.IMAP_SECURE,
      pollInterval: config.IMAP_POLL_INTERVAL,
    });

    try {
      await this.circuitBreaker.fire();
    } catch (error: any) {
      this.logger.error('Failed to start IMAP service', {
        error: error.message,
      });
      this.isRunning = false;
      throw error;
    }
  }

  private async connectAndPoll(): Promise<void> {
    try {
      await this.connect();
      this.startPolling();
    } catch (error: any) {
      this.logger.error('IMAP connection failed', {
        error: error.message,
        reconnectAttempts: this.reconnectAttempts,
      });

      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        
        this.logger.info('Retrying IMAP connection', {
          attempt: this.reconnectAttempts,
          delay,
        });

        setTimeout(() => {
          if (this.isRunning) {
            this.connectAndPoll().catch(() => {
              // Error already logged in connectAndPoll
            });
          }
        }, delay);
      } else {
        this.logger.error('Max IMAP reconnection attempts reached, giving up');
        this.isRunning = false;
        throw error;
      }
    }
  }

  private async connect(): Promise<void> {
    const startTime = Date.now();

    try {
      this.client = new ImapFlow({
        host: config.IMAP_HOST,
        port: config.IMAP_PORT,
        secure: config.IMAP_SECURE,
        auth: {
          user: config.IMAP_USER,
          pass: config.IMAP_PASS,
        },
        logger: false, // Disable ImapFlow logging to avoid conflicts
      });

      // Set up event handlers
      this.client.on('error', (error) => {
        this.logger.error('IMAP client error', {
          error: error.message,
        });
        this.metricsService.incrementCounter('imap_errors_total');
      });

      this.client.on('close', () => {
        this.logger.warn('IMAP connection closed');
        this.metricsService.incrementCounter('imap_disconnections_total');
        
        // Attempt to reconnect if service is still running
        if (this.isRunning) {
          setTimeout(() => {
            if (this.isRunning) {
              this.connectAndPoll().catch(() => {
                // Error already logged
              });
            }
          }, 5000);
        }
      });

      await this.client.connect();
      
      const mailbox = await this.client.mailboxOpen('INBOX');
      
      const duration = Date.now() - startTime;
      this.logger.info('IMAP connected successfully', {
        mailbox: mailbox.path,
        exists: mailbox.exists,
        duration,
      });

      this.metricsService.incrementCounter('imap_connections_total');
      this.metricsService.recordHistogram('imap_connection_duration_ms', duration);
      
      // Reset reconnection attempts on successful connection
      this.reconnectAttempts = 0;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error('IMAP connection failed', {
        error: error.message,
        duration,
        host: config.IMAP_HOST,
        port: config.IMAP_PORT,
      });

      this.metricsService.incrementCounter('imap_connection_failures_total');
      throw error;
    }
  }

  private startPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }

    this.logger.info('Starting IMAP polling', {
      interval: config.IMAP_POLL_INTERVAL,
    });

    this.pollInterval = setInterval(async () => {
      if (this.isRunning && this.client) {
        try {
          await this.pollForNewMessages();
        } catch (error: any) {
          this.logger.error('IMAP polling error', {
            error: error.message,
          });
          this.metricsService.incrementCounter('imap_polling_errors_total');
        }
      }
    }, config.IMAP_POLL_INTERVAL);
  }

  private async pollForNewMessages(): Promise<void> {
    if (!this.client) {
      throw new Error('IMAP client not connected');
    }

    const startTime = Date.now();

    try {
      const lock = await this.client.getMailboxLock('INBOX');
      
      try {
        // Search for unseen messages
        const messages = await this.client.search({ seen: false });
        
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
          this.logger.debug('No new messages found');
          return;
        }

        this.logger.info('Processing new messages', {
          count: messages.length,
        });

        let processedCount = 0;
        let errorCount = 0;

        for (const uid of messages) {
          try {
            await this.processMessage(uid);
            processedCount++;
          } catch (error: any) {
            this.logger.error('Failed to process message', {
              error: error.message,
              uid,
            });
            errorCount++;
          }
        }

        const duration = Date.now() - startTime;
        this.logger.info('IMAP polling completed', {
          totalMessages: messages.length,
          processed: processedCount,
          errors: errorCount,
          duration,
        });

        this.metricsService.incrementCounter('imap_messages_processed_total', processedCount);
        this.metricsService.incrementCounter('imap_message_errors_total', errorCount);
        this.metricsService.recordHistogram('imap_polling_duration_ms', duration);
      } finally {
        lock.release();
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error('IMAP polling failed', {
        error: error.message,
        duration,
      });
      throw error;
    }
  }

  private async processMessage(uid: number): Promise<void> {
    if (!this.client) {
      throw new Error('IMAP client not connected');
    }

    const startTime = Date.now();

    try {
      // Fetch message details
      const message = await this.client.fetchOne(uid, {
        envelope: true,
        bodyParts: ['text'],
        flags: true,
      });

      if (!message || typeof message !== 'object' || !('envelope' in message)) {
        throw new Error('Invalid message format');
      }

      const envelope = message.envelope;
      const from = envelope?.from?.[0];
      const subject = envelope?.subject || 'No Subject';
      const body = message.bodyParts?.get('text') || '';

      if (!from?.address) {
        throw new Error('Message has no sender address');
      }

      // Store message in database
      const savedMessage = await this.prisma.message.create({
        data: {
          fromName: from.name || 'Unknown',
          fromEmail: from.address,
          body: String(body).trim(),
          status: 'RECEIVED',
          context: {
            subject,
            uid,
            messageId: envelope?.messageId,
            date: envelope?.date?.toISOString(),
            source: 'imap',
          },
          events: {
            create: {
              type: 'INBOUND_RECEIVED',
              details: {
                uid,
                subject,
                messageId: envelope?.messageId,
              },
            },
          },
        },
      });

      // Mark message as seen
      await this.client.messageFlagsAdd(uid, ['\\Seen']);

      const duration = Date.now() - startTime;
      this.logger.info('Message processed successfully', {
        messageId: savedMessage.id,
        fromEmail: from.address,
        subject,
        uid,
        duration,
      });

      // Business event
      this.logger.business('inbound_message_received', {
        messageId: savedMessage.id,
        fromEmail: from.address,
        subject,
        source: 'imap',
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error('Failed to process IMAP message', {
        error: error.message,
        uid,
        duration,
      });
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn('IMAP service is not running');
      return;
    }

    this.isRunning = false;
    this.logger.info('Stopping IMAP service');

    // Clear polling interval
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = undefined;
    }

    // Close IMAP connection
    if (this.client) {
      try {
        await this.client.logout();
        this.logger.info('IMAP client disconnected gracefully');
      } catch (error: any) {
        this.logger.error('Error during IMAP logout', {
          error: error.message,
        });
      } finally {
        this.client = undefined;
      }
    }

    this.logger.info('IMAP service stopped');
  }

  async getHealth(): Promise<{
    status: 'healthy' | 'unhealthy';
    connected: boolean;
    lastCheck: Date;
    details: any;
  }> {
    const lastCheck = new Date();
    const connected = !!(this.client && this.isRunning);
    
    return {
      status: connected ? 'healthy' : 'unhealthy',
      connected,
      lastCheck,
      details: {
        isRunning: this.isRunning,
        reconnectAttempts: this.reconnectAttempts,
        maxReconnectAttempts: this.maxReconnectAttempts,
        circuitBreakerState: this.circuitBreaker.state,
        host: config.IMAP_HOST,
        port: config.IMAP_PORT,
        secure: config.IMAP_SECURE,
      },
    };
  }
}
