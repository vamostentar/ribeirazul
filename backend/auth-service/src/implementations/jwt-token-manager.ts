import {
  TokenCache,
  TokenManager,
  TokenManagerConfig,
  TokenVerificationResult
} from '@/interfaces/token-manager.interface';
import { JWTPayload, TokenPair } from '@/types/auth';
import { generateJTI, generateSecureToken } from '@/utils/crypto';
import * as jwt from 'jsonwebtoken';

/**
 * Implementação da interface TokenManager usando JWT
 */
export class JWTTokenManager implements TokenManager {
  private cache?: TokenCache;

  constructor(
    private config: TokenManagerConfig,
    cache?: TokenCache
  ) {
    this.cache = cache;
  }

  async generate(payload: JWTPayload): Promise<string> {
    const jti = generateJTI();
    const now = Math.floor(Date.now() / 1000);

    const tokenPayload = {
      ...payload,
      iat: now,
      iss: this.config.issuer,
      aud: this.config.audience,
      jti,
    };

    return jwt.sign(tokenPayload, this.config.secret, {
      expiresIn: this.config.accessExpiry,
      algorithm: (this.config.algorithm as any) || 'HS256',
    } as any);
  }

  async verify(token: string): Promise<JWTPayload> {
    // Check if token is revoked first
    const isRevoked = await this.isRevoked(token);
    if (isRevoked) {
      throw new Error('Token has been revoked');
    }

    // Verificar cache primeiro
    if (this.cache) {
      const cached = await this.cache.get(`token:${token}`);
      if (cached) {
        const result = cached as TokenVerificationResult;
        if (!result.valid) {
          throw new Error(result.error || 'Invalid token');
        }
        return result.payload!;
      }
    }

    try {
      const decoded = jwt.verify(token, this.config.secret, {
        issuer: this.config.issuer,
        audience: this.config.audience,
      }) as JWTPayload;

      // Cache successful verification
      if (this.cache) {
        await this.cache.set(`token:${token}`, {
          valid: true,
          payload: decoded,
        }, 300); // Cache for 5 minutes
      }

      return decoded;
    } catch (error) {
      // Cache failed verification
      if (this.cache) {
        await this.cache.set(`token:${token}`, {
          valid: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }, 60); // Cache failed verifications for 1 minute
      }

      throw error;
    }
  }

  async generatePair(payload: JWTPayload): Promise<TokenPair> {
    const accessToken = await this.generate(payload);
    const refreshToken = generateSecureToken(64);

    // Calculate expiry times
    const accessExpiry = new Date(Date.now() + this.parseTime(this.config.accessExpiry));
    const refreshExpiry = new Date(Date.now() + this.parseTime(this.config.refreshExpiry));

    return {
      accessToken,
      refreshToken,
      expiresIn: Math.floor(this.parseTime(this.config.accessExpiry) / 1000),
      tokenType: 'Bearer',
    };
  }

  async refresh(refreshToken: string, requestContext?: { ipAddress?: string; userAgent?: string }): Promise<TokenPair> {
    try {
      // Get Prisma instance from cache or create new one
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();

      // Look up the refresh token in the database
      const tokenRecord = await prisma.refreshToken.findUnique({
        where: { 
          token: refreshToken,
          isRevoked: false 
        },
        include: {
          user: {
            include: {
              role: true
            }
          }
        }
      });

      if (!tokenRecord) {
        throw new Error('Invalid refresh token');
      }

      // Check if token is expired
      if (tokenRecord.expiresAt < new Date()) {
        // Mark token as revoked
        await prisma.refreshToken.update({
          where: { id: tokenRecord.id },
          data: { 
            isRevoked: true,
            revokedAt: new Date()
          }
        });
        throw new Error('Refresh token expired');
      }

      // Check if user is still active
      if (!tokenRecord.user.isActive) {
        // Revoke all user's refresh tokens
        await prisma.refreshToken.updateMany({
          where: { userId: tokenRecord.userId },
          data: { 
            isRevoked: true,
            revokedAt: new Date()
          }
        });
        throw new Error('User account is inactive');
      }

      // Create new session for the refreshed token
      const sessionToken = generateSecureToken(64);
      const sessionExpiry = new Date(Date.now() + this.parseTime(this.config.refreshExpiry));
      
      const session = await prisma.session.create({
        data: {
          userId: tokenRecord.userId,
          sessionToken,
          expiresAt: sessionExpiry,
          ipAddress: requestContext?.ipAddress || 'unknown',
          userAgent: requestContext?.userAgent || 'unknown',
        }
      });

      // Create new JWT payload
      const payload: JWTPayload = {
        sub: tokenRecord.user.id,
        email: tokenRecord.user.email,
        role: tokenRecord.user.role.name,
        permissions: tokenRecord.user.role.permissions,
        sessionId: session.id,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + this.parseTime(this.config.accessExpiry) / 1000,
        iss: this.config.issuer,
        aud: this.config.audience,
        jti: generateJTI(),
      };

      // Generate new access token
      const accessToken = await this.generate(payload);

      // Create new refresh token
      const newRefreshToken = generateSecureToken(64);
      const refreshExpiry = new Date(Date.now() + this.parseTime(this.config.refreshExpiry));

      // Revoke old refresh token and create new one
      await prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { 
          isRevoked: true,
          revokedAt: new Date(),
          replacedBy: newRefreshToken
        }
      });

      await prisma.refreshToken.create({
        data: {
          token: newRefreshToken,
          userId: tokenRecord.userId,
          expiresAt: refreshExpiry,
          family: tokenRecord.family || generateJTI(),
          ipAddress: requestContext?.ipAddress || 'unknown',
          userAgent: requestContext?.userAgent || 'unknown',
        }
      });

      await prisma.$disconnect();

      return {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn: Math.floor(this.parseTime(this.config.accessExpiry) / 1000),
        tokenType: 'Bearer',
      };

    } catch (error) {
      throw new Error(`Refresh token validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  decode(token: string): JWTPayload {
    return jwt.decode(token) as JWTPayload;
  }

  isExpired(token: string): boolean {
    try {
      const decoded = this.decode(token);
      return !decoded.exp || decoded.exp < Math.floor(Date.now() / 1000);
    } catch {
      return true;
    }
  }

  async revoke(token: string): Promise<void> {
    try {
      const decoded = this.decode(token);
      if (decoded.jti) {
        // Get Prisma instance
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();

        // Add token to blacklist
        await prisma.tokenBlacklist.create({
          data: {
            jti: decoded.jti,
            tokenHash: await this.hashToken(token),
            userId: decoded.sub,
            expiresAt: new Date(decoded.exp! * 1000),
            reason: 'manual_revoke'
          }
        });

        await prisma.$disconnect();
      }
    } catch (error) {
      // Log error but don't throw - revocation should be best effort
      console.error('Failed to revoke token:', error);
    }
  }

  async isRevoked(token: string): Promise<boolean> {
    try {
      const decoded = this.decode(token);
      if (!decoded.jti) return false;

      // Get Prisma instance
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();

      // Check blacklist
      const blacklisted = await prisma.tokenBlacklist.findUnique({
        where: { jti: decoded.jti }
      });

      await prisma.$disconnect();
      return !!blacklisted;
    } catch {
      return true; // If we can't verify, consider it revoked
    }
  }

  async cleanupExpired(): Promise<number> {
    try {
      // Get Prisma instance
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();

      // Clean up expired blacklisted tokens
      const result = await prisma.tokenBlacklist.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      });

      await prisma.$disconnect();
      return result.count;
    } catch (error) {
      console.error('Failed to cleanup expired tokens:', error);
      return 0;
    }
  }

  /**
   * Hash token for storage in blacklist
   */
  private async hashToken(token: string): Promise<string> {
    const crypto = await import('crypto');
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Parse time string to milliseconds
   */
  private parseTime(time: string): number {
    const regex = /^(\d+)([smhd])$/;
    const match = time.match(regex);

    if (!match) {
      throw new Error(`Invalid time format: ${time}`);
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: throw new Error(`Invalid time unit: ${unit}`);
    }
  }
}
