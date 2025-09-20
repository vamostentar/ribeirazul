import { createSuccessResponse } from '@/middlewares/error-handler';
import { SessionService } from '@/services/session.service';
import { getRequestContext } from '@/utils/request-context';
import type { FastifyReply, FastifyRequest } from 'fastify';

export class SessionController {
  constructor(private sessionService: SessionService) {}

  /**
   * Get current user sessions
   * GET /api/v1/sessions/me
   */
  async getMySessions(
    request: FastifyRequest<{ 
      Querystring: { page?: number; limit?: number } 
    }>, 
    reply: FastifyReply
  ) {
    const context = getRequestContext(request)!;
    const userId = request.user?.id!;
    const { page = 1, limit = 20 } = request.query;
    
    const result = await this.sessionService.getUserSessions(
      userId, 
      { page, limit, sortBy: 'lastActiveAt', sortOrder: 'desc' }
    );
    
    return reply.code(200).send(
      createSuccessResponse(result.data, context.requestId, {
        pagination: result.pagination,
      })
    );
  }

  /**
   * Get current session details
   * GET /api/v1/sessions/current
   */
  async getCurrentSession(request: FastifyRequest, reply: FastifyReply) {
    const context = getRequestContext(request)!;
    const sessionToken = request.headers['x-session-token'] as string;
    
    const session = await this.sessionService.getSessionByToken(sessionToken);
    
    return reply.code(200).send(
      createSuccessResponse(session, context.requestId)
    );
  }

  /**
   * Terminate specific session
   * DELETE /api/v1/sessions/:sessionId
   */
  async terminateSession(
    request: FastifyRequest<{ Params: { sessionId: string } }>, 
    reply: FastifyReply
  ) {
    const context = getRequestContext(request)!;
    const { sessionId } = request.params;
    const userId = request.user?.id!;
    
    await this.sessionService.terminateSession(sessionId, userId, context);
    
    return reply.code(200).send(
      createSuccessResponse({ message: 'Session terminated successfully' }, context.requestId)
    );
  }

  /**
   * Terminate all sessions except current
   * POST /api/v1/sessions/terminate-all
   */
  async terminateAllSessions(request: FastifyRequest, reply: FastifyReply) {
    const context = getRequestContext(request)!;
    const userId = request.user?.id!;
    const currentSessionToken = request.headers['x-session-token'] as string;
    
    const count = await this.sessionService.terminateAllUserSessions(
      userId, 
      currentSessionToken, 
      context
    );
    
    return reply.code(200).send(
      createSuccessResponse(
        { message: `${count} sessions terminated successfully` }, 
        context.requestId
      )
    );
  }

  /**
   * Get user sessions (admin only)
   * GET /api/v1/sessions/user/:userId
   */
  async getUserSessions(
    request: FastifyRequest<{ 
      Params: { userId: string };
      Querystring: { page?: number; limit?: number } 
    }>, 
    reply: FastifyReply
  ) {
    const context = getRequestContext(request)!;
    const { userId } = request.params;
    const { page = 1, limit = 20 } = request.query;
    
    const result = await this.sessionService.getUserSessions(
      userId, 
      { page, limit, sortBy: 'lastActiveAt', sortOrder: 'desc' }
    );
    
    return reply.code(200).send(
      createSuccessResponse(result.data, context.requestId, {
        pagination: result.pagination,
      })
    );
  }

  /**
   * Terminate user session (admin only)
   * DELETE /api/v1/sessions/user/:userId/:sessionId
   */
  async terminateUserSession(
    request: FastifyRequest<{ 
      Params: { userId: string; sessionId: string } 
    }>, 
    reply: FastifyReply
  ) {
    const context = getRequestContext(request)!;
    const { sessionId } = request.params;
    const terminatedBy = request.user?.id!;
    
    await this.sessionService.terminateSessionAdmin(sessionId, terminatedBy, context);
    
    return reply.code(200).send(
      createSuccessResponse({ message: 'Session terminated successfully' }, context.requestId)
    );
  }

  /**
   * Get all active sessions (admin only)
   * GET /api/v1/sessions
   */
  async getAllSessions(
    request: FastifyRequest<{ 
      Querystring: { 
        page?: number; 
        limit?: number;
        isActive?: boolean;
        userId?: string;
      } 
    }>, 
    reply: FastifyReply
  ) {
    const context = getRequestContext(request)!;
    const { page = 1, limit = 20, isActive, userId } = request.query;
    
    const result = await this.sessionService.getAllSessions(
      { page, limit, sortBy: 'lastActiveAt', sortOrder: 'desc' },
      { isActive, userId }
    );
    
    return reply.code(200).send(
      createSuccessResponse(result.data, context.requestId, {
        pagination: result.pagination,
      })
    );
  }

  /**
   * Get session statistics (admin only)
   * GET /api/v1/sessions/statistics
   */
  async getSessionStatistics(request: FastifyRequest, reply: FastifyReply) {
    const context = getRequestContext(request)!;
    
    const stats = await this.sessionService.getStatistics();
    
    return reply.code(200).send(
      createSuccessResponse(stats, context.requestId)
    );
  }

  /**
   * Clean up expired sessions (admin only)
   * POST /api/v1/sessions/cleanup
   */
  async cleanupSessions(request: FastifyRequest, reply: FastifyReply) {
    const context = getRequestContext(request)!;
    
    const count = await this.sessionService.cleanupExpiredSessions();
    
    return reply.code(200).send(
      createSuccessResponse(
        { message: `${count} expired sessions cleaned up` }, 
        context.requestId
      )
    );
  }

  /**
   * Get suspicious sessions (admin only)
   * GET /api/v1/sessions/suspicious
   */
  async getSuspiciousSessions(
    request: FastifyRequest<{ 
      Querystring: { userId?: string } 
    }>, 
    reply: FastifyReply
  ) {
    const context = getRequestContext(request)!;
    const { userId } = request.query;
    
    const sessions = await this.sessionService.getSuspiciousSessions(userId);
    
    return reply.code(200).send(
      createSuccessResponse(sessions, context.requestId)
    );
  }
}
