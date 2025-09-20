import type { PaginatedResponse, Pagination } from '@/types/common';
import { PrismaClient } from '@prisma/client';
import { RefreshToken, Session } from '@/types/auth';

export class SessionRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create new session
   */
  async create(data: {
    userId: string;
    sessionToken: string;
    ipAddress?: string;
    userAgent?: string;
    location?: string;
    expiresAt: Date;
  }): Promise<Session> {
    return this.prisma.session.create({
      data: {
        userId: data.userId,
        sessionToken: data.sessionToken,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        location: data.location,
        expiresAt: data.expiresAt,
        isActive: true,
        lastActiveAt: new Date(),
      },
    });
  }

  /**
   * Find session by token
   */
  async findByToken(sessionToken: string): Promise<Session | null> {
    return this.prisma.session.findUnique({
      where: { sessionToken },
    });
  }

  /**
   * Find session by ID
   */
  async findById(id: string): Promise<Session | null> {
    return this.prisma.session.findUnique({
      where: { id },
    });
  }

  /**
   * Find active sessions for user
   */
  async findActiveByUserId(userId: string): Promise<Session[]> {
    return this.prisma.session.findMany({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActiveAt: 'desc' },
    });
  }

  /**
   * Get paginated sessions for user
   */
  async findByUserId(
    userId: string, 
    pagination: Pagination
  ): Promise<PaginatedResponse<Session>> {
    const { page, limit, sortBy = 'lastActiveAt', sortOrder = 'desc' } = pagination;
    const skip = (page - 1) * limit;

    const where = { userId };

    const [total, sessions] = await Promise.all([
      this.prisma.session.count({ where }),
      this.prisma.session.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
    ]);

    return {
      data: sessions,
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
   * Update session activity
   */
  async updateActivity(sessionToken: string): Promise<void> {
    await this.prisma.session.update({
      where: { sessionToken },
      data: {
        lastActiveAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Deactivate session
   */
  async deactivate(sessionToken: string): Promise<void> {
    await this.prisma.session.update({
      where: { sessionToken },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Deactivate session by ID
   */
  async deactivateById(id: string): Promise<void> {
    await this.prisma.session.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Deactivate all sessions for user
   */
  async deactivateAllForUser(userId: string, exceptSessionToken?: string): Promise<number> {
    const where: any = { userId, isActive: true };
    
    if (exceptSessionToken) {
      where.sessionToken = { not: exceptSessionToken };
    }

    const result = await this.prisma.session.updateMany({
      where,
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    return result.count;
  }

  /**
   * Delete expired sessions
   */
  async deleteExpired(): Promise<number> {
    const result = await this.prisma.session.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    return result.count;
  }

  /**
   * Delete session
   */
  async delete(sessionToken: string): Promise<void> {
    await this.prisma.session.delete({
      where: { sessionToken },
    });
  }

  /**
   * Delete session by ID
   */
  async deleteById(id: string): Promise<void> {
    await this.prisma.session.delete({
      where: { id },
    });
  }

  /**
   * Get session statistics
   */
  async getStatistics(): Promise<{
    total: number;
    active: number;
    expired: number;
    recentlyActive: number; // Last hour
  }> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const [total, active, expired, recentlyActive] = await Promise.all([
      this.prisma.session.count(),
      this.prisma.session.count({
        where: {
          isActive: true,
          expiresAt: { gt: now },
        },
      }),
      this.prisma.session.count({
        where: {
          expiresAt: { lt: now },
        },
      }),
      this.prisma.session.count({
        where: {
          lastActiveAt: { gte: oneHourAgo },
          isActive: true,
        },
      }),
    ]);

    return {
      total,
      active,
      expired,
      recentlyActive,
    };
  }

  /**
   * Get concurrent sessions count for user
   */
  async getConcurrentSessionsCount(userId: string): Promise<number> {
    return this.prisma.session.count({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
    });
  }

  /**
   * Cleanup old sessions (beyond max concurrent limit)
   */
  async cleanupOldSessions(userId: string, maxSessions: number): Promise<number> {
    // Get all active sessions for user, ordered by last activity
    const sessions = await this.prisma.session.findMany({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActiveAt: 'desc' },
    });

    // If within limit, no cleanup needed
    if (sessions.length <= maxSessions) {
      return 0;
    }

    // Deactivate oldest sessions
    const sessionsToDeactivate = sessions.slice(maxSessions);
    const sessionIds = sessionsToDeactivate.map((s: any) => s.id);

    const result = await this.prisma.session.updateMany({
      where: {
        id: { in: sessionIds },
      },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    return result.count;
  }

  /**
   * Find sessions by IP address
   */
  async findByIpAddress(ipAddress: string, limit: number = 50): Promise<Session[]> {
    return this.prisma.session.findMany({
      where: { ipAddress },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Find suspicious sessions (multiple IPs for same user)
   */
  async findSuspiciousSessions(userId: string): Promise<{
    sessionId: string;
    ipAddress: string;
    userAgent?: string;
    location?: string;
    lastActiveAt: Date;
  }[]> {
    // This would typically involve more complex logic
    // For now, return sessions with different IP addresses
    const sessions = await this.prisma.session.findMany({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        location: true,
        lastActiveAt: true,
      },
      orderBy: { lastActiveAt: 'desc' },
    });

    // Group by IP and return if multiple IPs exist
    const ipGroups = sessions.reduce((acc: any, session: any) => {
      const ip = session.ipAddress || 'unknown';
      if (!acc[ip]) acc[ip] = [];
      acc[ip].push(session);
      return acc;
    }, {} as Record<string, any[]>);

    // If only one IP group, no suspicious activity
    if (Object.keys(ipGroups).length <= 1) {
      return [];
    }

    // Return all sessions if multiple IPs detected
    return sessions.map((s: any) => ({
      sessionId: s.id,
      ipAddress: s.ipAddress || 'unknown',
      userAgent: s.userAgent || undefined,
      location: s.location || undefined,
      lastActiveAt: s.lastActiveAt,
    }));
  }
}

/**
 * Refresh Token Repository
 */
export class RefreshTokenRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create refresh token
   */
  async create(data: {
    token: string;
    userId: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
    family?: string;
  }): Promise<RefreshToken> {
    return this.prisma.refreshToken.create({
      data: {
        token: data.token,
        userId: data.userId,
        expiresAt: data.expiresAt,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        family: data.family,
        isRevoked: false,
      },
    });
  }

  /**
   * Find refresh token
   */
  async findByToken(token: string): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findUnique({
      where: { token },
    });
  }

  /**
   * Find active refresh tokens for user
   */
  async findActiveByUserId(userId: string): Promise<RefreshToken[]> {
    return this.prisma.refreshToken.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Revoke refresh token
   */
  async revoke(token: string, replacedBy?: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { token },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        replacedBy,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Revoke all refresh tokens for user
   */
  async revokeAllForUser(userId: string): Promise<number> {
    const result = await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return result.count;
  }

  /**
   * Revoke token family (for rotation detection)
   */
  async revokeFamily(family: string): Promise<number> {
    const result = await this.prisma.refreshToken.updateMany({
      where: {
        family,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return result.count;
  }

  /**
   * Delete expired refresh tokens
   */
  async deleteExpired(): Promise<number> {
    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    return result.count;
  }

  /**
   * Delete refresh token
   */
  async delete(token: string): Promise<void> {
    await this.prisma.refreshToken.delete({
      where: { token },
    });
  }
}
