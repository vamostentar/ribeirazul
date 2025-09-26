import { createLogger } from '@/utils/logger';
import { EventType, Message, MessageStatus, PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import { CacheService } from './cache.service';
import { EmailService } from './email.service';
import { MetricsService } from './metrics.service';

export interface CreateMessageDto {
  fromName: string;
  fromEmail: string;
  phone?: string;
  body: string;
  context?: any;
  correlationId?: string;
}

export interface MessageWithEvents extends Message {
  events: Array<{
    id: string;
    type: string;
    details: any;
    createdAt: Date;
  }>;
}

export interface PaginatedMessages {
  data: Message[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class MessageService {
  private logger = createLogger({ service: 'MessageService' });

  constructor(
    private prisma: PrismaClient,
    private metricsService: MetricsService,
    private cacheService: CacheService,
    private emailService: EmailService,
    private emailQueue?: Queue
  ) {}

  /**
   * Create and process a new message
   */
  async createMessage(data: CreateMessageDto): Promise<Message> {
    const startTime = Date.now();
    const correlationId = data.correlationId || uuidv4();
    const messageLogger = this.logger.child({ correlationId, operation: 'createMessage' });

    try {
      messageLogger.info('Creating new message', {
        fromEmail: data.fromEmail,
        fromName: data.fromName,
        hasPhone: !!data.phone,
        bodyLength: data.body.length,
      });

      // Create message in database
      const message = await this.prisma.message.create({
        data: {
          fromName: data.fromName,
          fromEmail: data.fromEmail,
          phone: data.phone,
          body: data.body,
          context: data.context,
          status: 'QUEUED',
          events: {
            create: {
              type: 'OUTBOUND_QUEUED',
              details: { correlationId },
            },
          },
        },
        include: {
          events: true,
        },
      });

      // Log database operation
      const dbDuration = Date.now() - startTime;
      messageLogger.database('create', 'Message', dbDuration, { messageId: message.id });

      // Queue email for processing (async)
      if (this.emailQueue) {
        await this.emailQueue.add(
          'send-contact-email',
          {
            messageId: message.id,
            fromName: data.fromName,
            fromEmail: data.fromEmail,
            phone: data.phone,
            body: data.body,
            correlationId,
          },
          {
            jobId: `email-${message.id}`,
            delay: 0,
          }
        );

        messageLogger.queue('add', 'email', `email-${message.id}`, {
          messageId: message.id,
        });
      } else {
        // Fallback: send email synchronously
        try {
          await this.emailService.sendContactEmail({
            fromName: data.fromName,
            fromEmail: data.fromEmail,
            phone: data.phone,
            body: data.body,
          });

          await this.updateMessageStatus(message.id, 'SENT', correlationId);
        } catch (error: any) {
          messageLogger.error('Failed to send email synchronously', {
            error: error.message,
            messageId: message.id,
          });
          
          await this.updateMessageStatus(message.id, 'FAILED', correlationId, error.message);
        }
      }

      // Update metrics
      this.metricsService.incrementCounter('messages_created_total');
      this.metricsService.recordHistogram('message_creation_duration_ms', Date.now() - startTime);

      // Log business event
      messageLogger.business('message_created', {
        messageId: message.id,
        fromEmail: data.fromEmail,
        status: message.status,
      });

      // Audit log
      messageLogger.audit('message_created', {
        messageId: message.id,
        fromEmail: data.fromEmail,
        fromName: data.fromName,
        ipAddress: data.context?.ipAddress,
        userAgent: data.context?.userAgent,
      });

      return message;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      messageLogger.error('Failed to create message', {
        error: error.message,
        duration,
        fromEmail: data.fromEmail,
      });

      this.metricsService.incrementCounter('messages_creation_errors_total');
      throw error;
    }
  }

  /**
   * Update message status with event logging
   */
  async updateMessageStatus(
    messageId: string,
    status: MessageStatus,
    correlationId: string,
    error?: string
  ): Promise<Message> {
    const messageLogger = this.logger.child({ correlationId, messageId, operation: 'updateStatus' });

    try {
      const eventType = this.getEventTypeFromStatus(status);
      
      const message = await this.prisma.message.update({
        where: { id: messageId },
        data: {
          status,
          error,
          retries: status === 'FAILED' ? { increment: 1 } : undefined,
          events: {
            create: {
              type: eventType,
              details: error ? { error, correlationId } : { correlationId },
            },
          },
        },
        include: {
          events: true,
        },
      });

      messageLogger.info('Message status updated', {
        messageId,
        oldStatus: status,
        newStatus: message.status,
        eventType,
      });

      // Update metrics
      this.metricsService.incrementCounter(`messages_${status.toLowerCase()}_total`);

      // Clear cache
      await this.cacheService.delete(`message:${messageId}`);

      return message;
    } catch (error: any) {
      messageLogger.error('Failed to update message status', {
        error: error.message,
        messageId,
        status,
      });
      throw error;
    }
  }

  /**
   * Get message by ID with caching
   */
  async getMessageById(id: string, useCache = true): Promise<MessageWithEvents | null> {
    const cacheKey = `message:${id}`;
    
    if (useCache) {
      const cached = await this.cacheService.get<MessageWithEvents>(cacheKey);
      if (cached) {
        this.metricsService.incrementCounter('messages_cache_hits_total');
        return cached;
      }
    }

    const startTime = Date.now();
    
    try {
      const message = await this.prisma.message.findUnique({
        where: { id },
        include: {
          events: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!message) {
        this.metricsService.incrementCounter('messages_not_found_total');
        return null;
      }

      // Cache the result
      if (useCache) {
        await this.cacheService.set(cacheKey, message, 300); // 5 minutes TTL
        this.metricsService.incrementCounter('messages_cache_misses_total');
      }

      const duration = Date.now() - startTime;
      this.logger.database('findUnique', 'Message', duration, { messageId: id });

      return message;
    } catch (error: any) {
      this.logger.error('Failed to get message by ID', {
        error: error.message,
        messageId: id,
      });
      throw error;
    }
  }

  /**
   * Get paginated messages with filtering
   */
  async getMessages(
    page = 1,
    limit = 20,
    filters: {
      status?: MessageStatus;
      fromEmail?: string;
      dateFrom?: Date;
      dateTo?: Date;
    } = {}
  ): Promise<PaginatedMessages> {
    const startTime = Date.now();
    const offset = (page - 1) * limit;

    try {
      const where: any = {};

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.fromEmail) {
        where.fromEmail = {
          contains: filters.fromEmail,
          mode: 'insensitive',
        };
      }

      if (filters.dateFrom || filters.dateTo) {
        where.createdAt = {};
        if (filters.dateFrom) {
          where.createdAt.gte = filters.dateFrom;
        }
        if (filters.dateTo) {
          where.createdAt.lte = filters.dateTo;
        }
      }

      const [messages, total] = await Promise.all([
        this.prisma.message.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limit,
        }),
        this.prisma.message.count({ where }),
      ]);

      const duration = Date.now() - startTime;
      this.logger.database('findMany', 'Message', duration, {
        count: messages.length,
        total,
        page,
        limit,
      });

      const totalPages = Math.ceil(total / limit);

      return {
        data: messages,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error: any) {
      this.logger.error('Failed to get messages', {
        error: error.message,
        page,
        limit,
        filters,
      });
      throw error;
    }
  }

  /**
   * Get message statistics
   */
  async getMessageStats(): Promise<{
    total: number;
    byStatus: Record<MessageStatus, number>;
    last24Hours: number;
    last7Days: number;
  }> {
    const cacheKey = 'message:stats';
    const cached = await this.cacheService.get<{
      total: number;
      byStatus: Record<MessageStatus, number>;
      last24Hours: number;
      last7Days: number;
    }>(cacheKey);
    
    if (cached) {
      this.metricsService.incrementCounter('message_stats_cache_hits_total');
      return cached;
    }

    const startTime = Date.now();
    
    try {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [total, byStatus, last24Hours, last7Days] = await Promise.all([
        this.prisma.message.count(),
        this.prisma.message.groupBy({
          by: ['status'],
          _count: true,
        }),
        this.prisma.message.count({
          where: {
            createdAt: { gte: yesterday },
          },
        }),
        this.prisma.message.count({
          where: {
            createdAt: { gte: weekAgo },
          },
        }),
      ]);

      const statusCounts = byStatus.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {} as Record<MessageStatus, number>);

      const stats = {
        total,
        byStatus: statusCounts,
        last24Hours,
        last7Days,
      };

      // Cache for 5 minutes
      await this.cacheService.set(cacheKey, stats, 300);

      const duration = Date.now() - startTime;
      this.logger.database('aggregate', 'Message', duration, { total, last24Hours, last7Days });

      this.metricsService.incrementCounter('message_stats_cache_misses_total');

      return stats;
    } catch (error: any) {
      this.logger.error('Failed to get message statistics', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Retry failed messages
   */
  async retryFailedMessages(limit = 10): Promise<number> {
    const startTime = Date.now();
    
    try {
      const failedMessages = await this.prisma.message.findMany({
        where: {
          status: 'FAILED',
          retries: { lt: 3 }, // Max 3 retries
        },
        take: limit,
        orderBy: { updatedAt: 'asc' },
      });

      if (failedMessages.length === 0) {
        return 0;
      }

      let retriedCount = 0;

      for (const message of failedMessages) {
        try {
          if (this.emailQueue) {
            await this.emailQueue.add(
              'retry-contact-email',
              {
                messageId: message.id,
                fromName: message.fromName,
                fromEmail: message.fromEmail,
                phone: message.phone,
                body: message.body,
                retry: true,
              },
              {
                jobId: `retry-${message.id}-${Date.now()}`,
                delay: 5000, // 5 second delay for retries
              }
            );

            await this.updateMessageStatus(message.id, 'QUEUED', uuidv4());
            retriedCount++;
          }
        } catch (error: any) {
          this.logger.error('Failed to retry message', {
            error: error.message,
            messageId: message.id,
          });
        }
      }

      const duration = Date.now() - startTime;
      this.logger.info('Retried failed messages', {
        retriedCount,
        totalFailed: failedMessages.length,
        duration,
      });

      this.metricsService.incrementCounter('messages_retried_total', retriedCount);

      return retriedCount;
    } catch (error: any) {
      this.logger.error('Failed to retry failed messages', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Clean up old messages
   */
  async cleanupOldMessages(daysOld = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const startTime = Date.now();

    try {
      const result = await this.prisma.message.deleteMany({
        where: {
          createdAt: { lt: cutoffDate },
          status: { in: ['SENT', 'FAILED'] },
        },
      });

      const duration = Date.now() - startTime;
      this.logger.info('Cleaned up old messages', {
        deletedCount: result.count,
        cutoffDate,
        duration,
      });

      this.metricsService.incrementCounter('messages_cleaned_total', result.count);

      return result.count;
    } catch (error: any) {
      this.logger.error('Failed to cleanup old messages', {
        error: error.message,
        cutoffDate,
      });
      throw error;
    }
  }

  private getEventTypeFromStatus(status: MessageStatus): EventType {
    switch (status) {
      case 'QUEUED':
        return 'OUTBOUND_QUEUED';
      case 'SENT':
        return 'OUTBOUND_SENT';
      case 'FAILED':
        return 'OUTBOUND_FAILED';
      case 'RECEIVED':
        return 'INBOUND_RECEIVED';
      default:
        return 'OUTBOUND_QUEUED'; // fallback
    }
  }
}
