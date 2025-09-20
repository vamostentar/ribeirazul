import { RefreshTokenRepository, SessionRepository } from '@/repositories/session.repository';
import { UserRepository } from '@/repositories/user.repository';
import type { PaginatedResponse, Pagination, RequestContext } from '@/types/common';
import { ForbiddenError, NotFoundError } from '@/types/common';
import { logger } from '@/utils/logger';
import { PrismaClient } from '@prisma/client';

export class SessionService {
  private _sessionRepository?: SessionRepository;
  private _refreshTokenRepository?: RefreshTokenRepository;
  private _userRepository?: UserRepository;

  constructor(private prisma: PrismaClient) {
    // Dependencies are initialized lazily
  }

  private get sessionRepository(): SessionRepository {
    if (!this._sessionRepository) {
      this._sessionRepository = new SessionRepository(this.prisma);
    }
    return this._sessionRepository;
  }

  private get refreshTokenRepository(): RefreshTokenRepository {
    if (!this._refreshTokenRepository) {
      this._refreshTokenRepository = new RefreshTokenRepository(this.prisma);
    }
    return this._refreshTokenRepository;
  }

  private get userRepository(): UserRepository {
    if (!this._userRepository) {
      this._userRepository = new UserRepository(this.prisma);
    }
    return this._userRepository;
  }

  /**
   * Get session by token
   */
  async getSessionByToken(sessionToken: string) {
    const session = await this.sessionRepository.findByToken(sessionToken);
    
    if (!session) {
      throw new NotFoundError('Session not found');
    }
    
    return this.sanitizeSession(session);
  }

  /**
   * Get user sessions
   */
  async getUserSessions(
    userId: string,
    pagination: Pagination
  ): Promise<PaginatedResponse<any>> {
    const result = await this.sessionRepository.findByUserId(userId, pagination);
    
    return {
      data: result.data.map(session => this.sanitizeSession(session)),
      pagination: result.pagination,
    };
  }

  /**
   * Get all sessions (admin)
   */
  async getAllSessions(
    pagination: Pagination,
    filters?: {
      isActive?: boolean;
      userId?: string;
    }
  ): Promise<PaginatedResponse<any>> {
    // Build where clause
    const where: any = {};
    
    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }
    
    if (filters?.userId) {
      where.userId = filters.userId;
    }

    const { page, limit, sortBy = 'lastActiveAt', sortOrder = 'desc' } = pagination;
    const skip = (page - 1) * limit;

    const [total, sessions] = await Promise.all([
      this.prisma.session.count({ where }),
      this.prisma.session.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
    ]);

    return {
      data: sessions.map((session: any) => this.sanitizeSession(session)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Terminate session
   */
  async terminateSession(
    sessionId: string, 
    userId: string, 
    context: RequestContext
  ) {
    const session = await this.sessionRepository.findById(sessionId);
    
    if (!session) {
      throw new NotFoundError('Session not found');
    }
    
    // Check ownership
    if (session.userId !== userId) {
      throw new ForbiddenError('You can only terminate your own sessions');
    }

    await this.sessionRepository.deactivateById(sessionId);

    logger.info({
      requestId: context.requestId,
      userId,
      sessionId,
    }, 'Session terminated by user');
  }

  /**
   * Terminate session (admin)
   */
  async terminateSessionAdmin(
    sessionId: string, 
    terminatedBy: string, 
    context: RequestContext
  ) {
    const session = await this.sessionRepository.findById(sessionId);
    
    if (!session) {
      throw new NotFoundError('Session not found');
    }

    await this.sessionRepository.deactivateById(sessionId);

    logger.warn({
      requestId: context.requestId,
      sessionId,
      userId: session.userId,
      terminatedBy,
    }, 'Session terminated by admin');
  }

  /**
   * Terminate all user sessions except current
   */
  async terminateAllUserSessions(
    userId: string, 
    exceptSessionToken: string, 
    context: RequestContext
  ): Promise<number> {
    const count = await this.sessionRepository.deactivateAllForUser(
      userId, 
      exceptSessionToken
    );

    logger.info({
      requestId: context.requestId,
      userId,
      sessionsTerminated: count,
    }, 'All user sessions terminated');

    return count;
  }

  /**
   * Get session statistics
   */
  async getStatistics() {
    return this.sessionRepository.getStatistics();
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const count = await this.sessionRepository.deleteExpired();
    
    if (count > 0) {
      logger.info({
        sessionsDeleted: count,
      }, 'Expired sessions cleaned up');
    }

    return count;
  }

  /**
   * Get suspicious sessions
   */
  async getSuspiciousSessions(userId?: string) {
    if (userId) {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }
      
      return this.sessionRepository.findSuspiciousSessions(userId);
    }

    // Get all users with multiple IPs
    const users = await this.prisma.user.findMany({
      where: {
        sessions: {
          some: {
            isActive: true,
            expiresAt: { gt: new Date() },
          },
        },
      },
      select: { id: true },
    });

    const suspiciousSessions = [];
    
    for (const user of users) {
      const userSuspicious = await this.sessionRepository.findSuspiciousSessions(user.id);
      if (userSuspicious.length > 0) {
        suspiciousSessions.push({
          userId: user.id,
          sessions: userSuspicious,
        });
      }
    }

    return suspiciousSessions;
  }

  /**
   * Update session activity
   */
  async updateActivity(sessionToken: string) {
    try {
      await this.sessionRepository.updateActivity(sessionToken);
    } catch (error) {
      // Log but don't throw - this is non-critical
      logger.error({
        sessionToken,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to update session activity');
    }
  }

  /**
   * Sanitize session data
   */
  private sanitizeSession(session: any) {
    const { sessionToken, ...safeSession } = session;
    
    // Mask session token for security
    if (sessionToken) {
      safeSession.sessionTokenPreview = sessionToken.substring(0, 8) + '...';
    }
    
    return safeSession;
  }
}
