import { SessionController } from '@/controllers/session.controller';
import { authenticate, requireRole } from '@/middlewares/auth.middleware';
import { SessionService } from '@/services/session.service';
import { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

export async function sessionRoutes(fastify: FastifyInstance) {
  const prisma = fastify.prisma as PrismaClient;
  const sessionService = new SessionService(prisma);
  const sessionController = new SessionController(sessionService);

  // All routes require authentication
  fastify.addHook('onRequest', authenticate);

  // Current user session routes
  fastify.get<{ Querystring: { page?: number; limit?: number } }>('/me', {
    schema: {
      tags: ['Sessions'],
      summary: 'Get current user sessions',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', minimum: 1, default: 1 },
          limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
        },
      },
      response: {
        200: {
          description: 'User sessions',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: { type: 'object' },
            },
            meta: {
              type: 'object',
              properties: {
                pagination: {
                  type: 'object',
                  properties: {
                    page: { type: 'number' },
                    limit: { type: 'number' },
                    total: { type: 'number' },
                    totalPages: { type: 'number' },
                    hasNext: { type: 'boolean' },
                    hasPrev: { type: 'boolean' },
                  },
                },
              },
            },
          },
        },
      },
    },
  }, sessionController.getMySessions.bind(sessionController));

  fastify.get('/current', {
    schema: {
      tags: ['Sessions'],
      summary: 'Get current session details',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          description: 'Current session',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            meta: { type: 'object' },
          },
        },
      },
    },
  }, sessionController.getCurrentSession.bind(sessionController));

  fastify.delete<{ Params: { sessionId: string } }>('/:sessionId', {
    schema: {
      tags: ['Sessions'],
      summary: 'Terminate specific session',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['sessionId'],
        properties: {
          sessionId: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          description: 'Session terminated',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                message: { type: 'string' },
              },
            },
            meta: { type: 'object' },
          },
        },
        403: {
          description: 'Cannot terminate other users sessions',
          type: 'object',
        },
        404: {
          description: 'Session not found',
          type: 'object',
        },
      },
    },
  }, sessionController.terminateSession.bind(sessionController));

  fastify.post('/terminate-all', {
    schema: {
      tags: ['Sessions'],
      summary: 'Terminate all sessions except current',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          description: 'Sessions terminated',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                message: { type: 'string' },
              },
            },
            meta: { type: 'object' },
          },
        },
      },
    },
  }, sessionController.terminateAllSessions.bind(sessionController));

  // Admin-only routes
  fastify.register(async function adminRoutes(fastify) {
    fastify.addHook('onRequest', requireRole(['admin', 'super_admin']));

    // Get all sessions
    fastify.get<{ 
      Querystring: { 
        page?: number; 
        limit?: number; 
        isActive?: boolean; 
        userId?: string 
      } 
    }>('/', {
      schema: {
        tags: ['Sessions'],
        summary: 'Get all sessions (admin)',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number', minimum: 1, default: 1 },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
            isActive: { type: 'boolean' },
            userId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'All sessions',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'array',
                items: { type: 'object' },
              },
              meta: {
                type: 'object',
                properties: {
                  pagination: {
                    type: 'object',
                    properties: {
                      page: { type: 'number' },
                      limit: { type: 'number' },
                      total: { type: 'number' },
                      totalPages: { type: 'number' },
                      hasNext: { type: 'boolean' },
                      hasPrev: { type: 'boolean' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }, sessionController.getAllSessions.bind(sessionController));

    // Session statistics
    fastify.get('/statistics', {
      schema: {
        tags: ['Sessions'],
        summary: 'Get session statistics',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Session statistics',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  total: { type: 'number' },
                  active: { type: 'number' },
                  expired: { type: 'number' },
                  recentlyActive: { type: 'number' },
                },
              },
              meta: { type: 'object' },
            },
          },
        },
      },
    }, sessionController.getSessionStatistics.bind(sessionController));

    // Get user sessions
    fastify.get<{ 
      Params: { userId: string }; 
      Querystring: { page?: number; limit?: number } 
    }>('/user/:userId', {
      schema: {
        tags: ['Sessions'],
        summary: 'Get user sessions (admin)',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string', format: 'uuid' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number', minimum: 1, default: 1 },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
          },
        },
        response: {
          200: {
            description: 'User sessions',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'array',
                items: { type: 'object' },
              },
              meta: {
                type: 'object',
                properties: {
                  pagination: {
                    type: 'object',
                    properties: {
                      page: { type: 'number' },
                      limit: { type: 'number' },
                      total: { type: 'number' },
                      totalPages: { type: 'number' },
                      hasNext: { type: 'boolean' },
                      hasPrev: { type: 'boolean' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }, sessionController.getUserSessions.bind(sessionController));

    // Terminate user session
    fastify.delete<{ 
      Params: { userId: string; sessionId: string } 
    }>('/user/:userId/:sessionId', {
      schema: {
        tags: ['Sessions'],
        summary: 'Terminate user session (admin)',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['userId', 'sessionId'],
          properties: {
            userId: { type: 'string', format: 'uuid' },
            sessionId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Session terminated',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                },
              },
              meta: { type: 'object' },
            },
          },
          404: {
            description: 'Session not found',
            type: 'object',
          },
        },
      },
    }, sessionController.terminateUserSession.bind(sessionController));

    // Cleanup expired sessions
    fastify.post('/cleanup', {
      schema: {
        tags: ['Sessions'],
        summary: 'Cleanup expired sessions',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Cleanup completed',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                },
              },
              meta: { type: 'object' },
            },
          },
        },
      },
    }, sessionController.cleanupSessions.bind(sessionController));

    // Get suspicious sessions
    fastify.get<{ Querystring: { userId?: string } }>('/suspicious', {
      schema: {
        tags: ['Sessions'],
        summary: 'Get suspicious sessions',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            userId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Suspicious sessions',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'array',
                items: { type: 'object' },
              },
              meta: { type: 'object' },
            },
          },
        },
      },
    }, sessionController.getSuspiciousSessions.bind(sessionController));
  });
}


