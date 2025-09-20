import { createRequestContext, createTraceHeaders } from '@/utils/request-context';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Request context middleware
 * Creates and attaches request context to all incoming requests
 */
export async function requestContextMiddleware(fastify: any) {
  console.log('🔧 Request context middleware registered');
  // Add hook to create request context for every request
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // Create request context
    request.requestContext = createRequestContext(request);
    
    // Debug log
    console.log('🔍 Request context created:', {
      requestId: request.requestContext?.requestId,
      url: request.url,
      method: request.method
    });
    
    // Add correlation headers to response
    const traceHeaders = createTraceHeaders(request.requestContext);
    Object.entries(traceHeaders).forEach(([key, value]) => {
      reply.header(key, value);
    });
  });

  // Add hook to log request completion
  fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const context = request.requestContext;
    if (!context) return;

    const duration = Date.now() - context.startTime;
    
    // Add performance headers
    reply.header('x-response-time', `${duration}ms`);
    
    // Log slow requests
    if (duration > 1000) { // More than 1 second
      fastify.log.warn({
        requestId: context.requestId,
        method: request.method,
        url: request.url,
        duration,
        statusCode: reply.statusCode,
      }, 'Slow request detected');
    }
  });
}


