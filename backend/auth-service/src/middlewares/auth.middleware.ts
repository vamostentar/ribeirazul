import type { Permission } from '@/types/common';
import { ForbiddenError, UnauthorizedError } from '@/types/common';
import { logger } from '@/utils/logger';
import { updateRequestContextWithUser } from '@/utils/request-context';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Authentication middleware
 * Verifies JWT token and sets user information on request
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Verify JWT token (this uses @fastify/jwt plugin)
    await request.jwtVerify();
    
    // Extract user information from JWT payload
    const payload = request.user as any;
    
    if (!payload || !payload.sub) {
      throw new UnauthorizedError('Invalid token payload');
    }

    // Validate session if sessionId is present
    if (payload.sessionId) {
      await validateSession(request, reply);
    }

    // Set user information on request
    request.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      permissions: payload.permissions || [],
    };

    // Update request context with user info
    updateRequestContextWithUser(request, payload.sub, payload.role);

    logger.debug({
      requestId: request.requestContext?.requestId,
      userId: payload.sub,
      role: payload.role,
    }, 'User authenticated successfully');

  } catch (error) {
    logger.warn({
      requestId: request.requestContext?.requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      url: request.url,
      method: request.method,
    }, 'Authentication failed');

    throw new UnauthorizedError('Authentication required');
  }
}

/**
 * Authorization middleware factory
 * Creates middleware that checks if user has required permissions
 */
export function authorize(requiredPermissions: Permission[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const userPermissions = request.user.permissions || [];
    
    // Check if user has all permissions or wildcard permission
    const hasWildcard = userPermissions.includes('*');
    const hasAllPermissions = requiredPermissions.every(permission => 
      userPermissions.includes(permission)
    );

    if (!hasWildcard && !hasAllPermissions) {
      logger.warn({
        requestId: request.requestContext?.requestId,
        userId: request.user.id,
        userRole: request.user.role,
        userPermissions,
        requiredPermissions,
        url: request.url,
        method: request.method,
      }, 'Authorization failed: insufficient permissions');

      throw new ForbiddenError('Insufficient permissions');
    }

    logger.debug({
      requestId: request.requestContext?.requestId,
      userId: request.user.id,
      requiredPermissions,
    }, 'User authorized successfully');
  };
}

/**
 * Role-based authorization middleware
 * Checks if user has one of the required roles
 */
export function requireRole(allowedRoles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const userRole = request.user.role;
    
    if (!allowedRoles.includes(userRole)) {
      logger.warn({
        requestId: request.requestContext?.requestId,
        userId: request.user.id,
        userRole,
        allowedRoles,
        url: request.url,
        method: request.method,
      }, 'Authorization failed: insufficient role');

      throw new ForbiddenError(`Role '${userRole}' is not authorized for this action`);
    }

    logger.debug({
      requestId: request.requestContext?.requestId,
      userId: request.user.id,
      userRole,
    }, 'Role authorization successful');
  };
}

/**
 * Self-access authorization middleware
 * Allows users to access their own resources or admins to access any
 */
export function requireSelfOrAdmin(userIdParam: string = 'userId') {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const params = request.params as Record<string, string>;
    const targetUserId = params[userIdParam];
    const currentUserId = request.user.id;
    const userRole = request.user.role;
    
    // Allow if user is accessing their own resource
    if (targetUserId === currentUserId) {
      return;
    }

    // Allow if user has admin privileges
    const adminRoles = ['super_admin', 'admin'];
    if (adminRoles.includes(userRole)) {
      return;
    }

    logger.warn({
      requestId: request.requestContext?.requestId,
      userId: currentUserId,
      targetUserId,
      userRole,
      url: request.url,
      method: request.method,
    }, 'Authorization failed: not self or admin');

    throw new ForbiddenError('You can only access your own resources');
  };
}

/**
 * Optional authentication middleware
 * Sets user information if token is present and valid, but doesn't require it
 */
export async function optionalAuthenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      await request.jwtVerify();
      
      const payload = request.user as any;
      if (payload && payload.sub) {
        request.user = {
          id: payload.sub,
          email: payload.email,
          role: payload.role,
          permissions: payload.permissions || [],
        };
        
        updateRequestContextWithUser(request, payload.sub, payload.role);
      }
    }
  } catch (error) {
    // Ignore authentication errors for optional auth
    logger.debug({
      requestId: request.requestContext?.requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Optional authentication failed, continuing without user');
  }
}

/**
 * API Key authentication middleware
 * Verifies API key from header
 */
export async function authenticateApiKey(request: FastifyRequest, reply: FastifyReply) {
  const apiKey = request.headers['x-api-key'] as string;
  
  if (!apiKey) {
    throw new UnauthorizedError('API key required');
  }

  try {
    // Get Prisma instance from Fastify
    const prisma = (request.server as any).prisma;
    
    // Hash the provided API key
    const crypto = await import('crypto');
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    
    // Look up the key in the database
    const apiKeyRecord = await prisma.apiKey.findUnique({
      where: { keyHash },
      include: {
        // Include any related data if needed
      }
    });

    if (!apiKeyRecord) {
      logger.warn({
        requestId: request.requestContext?.requestId,
        keyPreview: apiKey.substring(0, 8) + '...',
        ipAddress: request.ip,
      }, 'Invalid API key provided');

      throw new UnauthorizedError('Invalid API key');
    }

    // Verify it's active and not expired
    if (!apiKeyRecord.isActive) {
      logger.warn({
        requestId: request.requestContext?.requestId,
        keyId: apiKeyRecord.id,
        ipAddress: request.ip,
      }, 'Inactive API key used');

      throw new UnauthorizedError('API key is inactive');
    }

    if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
      logger.warn({
        requestId: request.requestContext?.requestId,
        keyId: apiKeyRecord.id,
        expiresAt: apiKeyRecord.expiresAt,
        ipAddress: request.ip,
      }, 'Expired API key used');

      throw new UnauthorizedError('API key has expired');
    }

    // Update usage tracking
    await prisma.apiKey.update({
      where: { id: apiKeyRecord.id },
      data: {
        lastUsedAt: new Date(),
        usageCount: { increment: 1 }
      }
    });

    // Set permissions based on the API key's scope
    request.user = {
      id: `api-key-${apiKeyRecord.id}`,
      email: `api-key-${apiKeyRecord.name}`,
      role: 'api_key',
      permissions: apiKeyRecord.permissions,
      scopes: apiKeyRecord.scopes,
      apiKeyId: apiKeyRecord.id,
    };

    // Update request context
    updateRequestContextWithUser(request, `api-key-${apiKeyRecord.id}`, 'api_key');

    logger.debug({
      requestId: request.requestContext?.requestId,
      keyId: apiKeyRecord.id,
      permissions: apiKeyRecord.permissions,
      scopes: apiKeyRecord.scopes,
    }, 'API key authentication successful');

  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }

    logger.error({
      requestId: request.requestContext?.requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      ipAddress: request.ip,
    }, 'API key authentication failed');

    throw new UnauthorizedError('API key authentication failed');
  }
}

/**
 * Rate limiting bypass for authenticated users
 * Allows higher rate limits for authenticated users
 */
export function createAuthenticatedRateLimit(
  authenticatedMax: number,
  unauthenticatedMax: number,
  windowMs: number
) {
  return {
    max: (request: FastifyRequest) => {
      return request.user ? authenticatedMax : unauthenticatedMax;
    },
    timeWindow: windowMs,
    keyGenerator: (request: FastifyRequest) => {
      // Use user ID for authenticated users, IP for unauthenticated
      return request.user?.id || request.ip;
    },
  };
}

/**
 * Session validation middleware
 * Verifies that the session referenced in JWT is still valid
 */
export async function validateSession(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const payload = request.user as any;
  const sessionId = payload.sessionId;
  
  if (!sessionId) {
    throw new UnauthorizedError('Invalid token: missing session ID');
  }

  try {
    // Get Prisma instance from Fastify
    const prisma = (request.server as any).prisma;
    
    // Look up the session in the database
    const session = await prisma.session.findUnique({
      where: { 
        id: sessionId,
        isActive: true 
      },
      include: {
        user: {
          select: {
            id: true,
            isActive: true,
            email: true
          }
        }
      }
    });

    if (!session) {
      logger.warn({
        requestId: request.requestContext?.requestId,
        sessionId,
        userId: payload.sub,
      }, 'Session not found or inactive');

      throw new UnauthorizedError('Invalid session');
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      logger.warn({
        requestId: request.requestContext?.requestId,
        sessionId,
        userId: payload.sub,
        expiresAt: session.expiresAt,
      }, 'Session expired');

      // Mark session as inactive
      await prisma.session.update({
        where: { id: sessionId },
        data: { isActive: false }
      });

      throw new UnauthorizedError('Session expired');
    }

    // Check if user is still active
    if (!session.user.isActive) {
      logger.warn({
        requestId: request.requestContext?.requestId,
        sessionId,
        userId: payload.sub,
      }, 'User account is inactive');

      // Mark session as inactive
      await prisma.session.update({
        where: { id: sessionId },
        data: { isActive: false }
      });

      throw new UnauthorizedError('User account is inactive');
    }

    // Update last activity timestamp
    await prisma.session.update({
      where: { id: sessionId },
      data: { lastActiveAt: new Date() }
    });

    logger.debug({
      requestId: request.requestContext?.requestId,
      userId: payload.sub,
      sessionId,
    }, 'Session validated successfully');

  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }

    logger.error({
      requestId: request.requestContext?.requestId,
      sessionId,
      userId: payload.sub,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Session validation failed');

    throw new UnauthorizedError('Session validation failed');
  }
}

/**
 * Two-factor authentication requirement middleware
 * Ensures user has completed 2FA if it's required
 */
export async function requireTwoFactor(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const payload = request.user as any;
  
  // Check if 2FA is required and completed
  if (payload.requiresTwoFactor && !payload.twoFactorVerified) {
    logger.warn({
      requestId: request.requestContext?.requestId,
      userId: payload.sub,
    }, 'Two-factor authentication required');

    throw new ForbiddenError('Two-factor authentication required');
  }
}


