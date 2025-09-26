import { config } from '@/utils/config';
import { createCorrelationId } from '@/utils/logger';
import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';

// Validation schemas
const createMessageSchema = z.object({
  fromName: z.string().min(2).max(100),
  fromEmail: z.string().email(),
  phone: z.string().optional(),
  body: z.string().min(5).max(5000),
  context: z.any().optional(),
});

// Simple authentication
async function authenticateRequest(request: FastifyRequest): Promise<boolean> {
  const apiKey = request.headers[config.API_KEY_HEADER] as string;
  const allowedKeys = config.ALLOWED_API_KEYS;
  
  if (!allowedKeys) return true;
  
  const allowedKeysSet = new Set(allowedKeys.split(',').map(key => key.trim()));
  return !!(apiKey && allowedKeysSet.has(apiKey));
}

export async function registerMessageRoutes(app: FastifyInstance) {
  const { messageService, metricsService } = app.diContainer;

  // Add correlation ID
  app.addHook('onRequest', async (request) => {
    const correlationId = (request.headers['x-correlation-id'] as string) || createCorrelationId();
    request.correlationId = correlationId;
  });

  // Authentication for POST requests
  app.addHook('preHandler', async (request, reply) => {
    if (request.url.startsWith('/api/v1/messages') && request.method !== 'GET') {
      const isAuthenticated = await authenticateRequest(request);
      if (!isAuthenticated) {
        metricsService.incrementCounter('unauthorized_requests_total');
        return reply.code(401).send({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Valid API key required',
        });
      }
    }
  });

  // Create message
  app.post<{
    Body: z.infer<typeof createMessageSchema>;
  }>('/api/v1/messages', {
    schema: {
      body: createMessageSchema,
    },
  }, async (request, reply) => {
    const startTime = Date.now();
    const { fromName, fromEmail, phone, body, context } = request.body;
    const correlationId = request.correlationId!;
    
    try {
      request.log.info(`Creating message from ${fromEmail} (${correlationId})`);

      const message = await messageService.createMessage({
        fromName,
        fromEmail,
        phone,
        body,
        context: {
          ...context,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
          correlationId,
        },
        correlationId,
      });

      const duration = Date.now() - startTime;
      request.log.info(`Message created: ${message.id} in ${duration}ms`);

      return reply.code(201).send({
        success: true,
        data: {
          id: message.id,
          status: message.status,
        },
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      request.log.error(`Failed to create message: ${error.message} (${duration}ms)`);
      
      metricsService.incrementCounter('message_creation_errors_total');

      return reply.code(500).send({
        success: false,
        error: 'MESSAGE_CREATION_FAILED',
        message: 'Failed to create message',
      });
    }
  });

  // Get message by ID
  app.get<{
    Params: { id: string };
  }>('/api/v1/messages/:id', async (request, reply) => {
    const { id } = request.params;
    
    try {
      const message = await messageService.getMessageById(id);
      
      if (!message) {
        return reply.code(404).send({
          success: false,
          error: 'NOT_FOUND',
          message: 'Message not found',
        });
      }

      request.log.info(`Message retrieved: ${id}`);

      return reply.send({
        success: true,
        data: message,
      });
    } catch (error: any) {
      request.log.error(`Failed to get message ${id}: ${error.message}`);

      return reply.code(500).send({
        success: false,
        error: 'FETCH_FAILED',
        message: 'Failed to fetch message',
      });
    }
  });

  // Get messages with pagination
  app.get('/api/v1/messages', async (request, reply) => {
    const query = request.query as any;
    const page = parseInt(query.page) || 1;
    const limit = Math.min(parseInt(query.limit) || 20, 100);
    
    try {
      const filters: any = {};
      if (query.status) filters.status = query.status;
      if (query.fromEmail) filters.fromEmail = query.fromEmail;
      if (query.dateFrom) filters.dateFrom = new Date(query.dateFrom);
      if (query.dateTo) filters.dateTo = new Date(query.dateTo);

      const result = await messageService.getMessages(page, limit, filters);

      request.log.info(`Messages retrieved: ${result.data.length}/${result.total}`);

      return reply.send({
        success: true,
        data: result.data,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error: any) {
      request.log.error(`Failed to get messages: ${error.message}`);

      return reply.code(500).send({
        success: false,
        error: 'FETCH_FAILED',
        message: 'Failed to fetch messages',
      });
    }
  });

  // Get statistics
  app.get('/api/v1/messages/stats', async (request, reply) => {
    try {
      const stats = await messageService.getMessageStats();
      request.log.info(`Stats retrieved: ${stats.total} total messages`);

      return reply.send({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      request.log.error(`Failed to get stats: ${error.message}`);

      return reply.code(500).send({
        success: false,
        error: 'STATS_FAILED',
        message: 'Failed to fetch statistics',
      });
    }
  });

  // Retry failed messages
  app.post('/api/v1/messages/retry', async (request, reply) => {
    try {
      const retriedCount = await messageService.retryFailedMessages();
      request.log.info(`Retried ${retriedCount} messages`);

      return reply.send({
        success: true,
        data: { retriedCount },
      });
    } catch (error: any) {
      request.log.error(`Failed to retry messages: ${error.message}`);

      return reply.code(500).send({
        success: false,
        error: 'RETRY_FAILED',
        message: 'Failed to retry messages',
      });
    }
  });
}
