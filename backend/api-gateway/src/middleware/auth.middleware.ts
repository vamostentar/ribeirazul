import { FastifyReply, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export interface JWTPayload {
  sub: string;
  email: string;
  role: string;
  permissions: string[];
  sessionId?: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
  jti?: string;
}

export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: string;
    email: string;
    role: string;
    permissions: string[];
  };
}

/**
 * JWT Authentication middleware for API Gateway
 * Validates JWT tokens and sets user context
 */
export async function authenticateJWT(
  request: AuthenticatedRequest, 
  reply: FastifyReply
): Promise<void> {
  try {
    // Debug logging for uploads routes
    if (request.url.startsWith('/uploads')) {
      console.log(`🔍 Auth Debug: Checking uploads route: ${request.method} ${request.url}`);
    }
    
    // Skip authentication for public routes
    if (isPublicRoute(request.url, request.method)) {
      if (request.url.startsWith('/uploads')) {
        console.log(`✅ Auth Debug: Uploads route is public, skipping auth`);
      }
      return;
    }
    
    if (request.url.startsWith('/uploads')) {
      console.log(`❌ Auth Debug: Uploads route NOT recognized as public!`);
    }

    // Extract token from Authorization header
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.status(401).send({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Authorization token is required'
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: (request as any).requestContext?.requestId,
        }
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token
    const decoded = jwt.verify(token, getJWTSecret(), {
      issuer: 'ribeirazul-auth-service',
      audience: 'ribeirazul-api',
    }) as JWTPayload;

    if (!decoded || !decoded.sub) {
      throw new Error('Invalid token payload');
    }

    // Set user information on request
    request.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions || [],
    };

    // Log successful authentication
    if (config.ENABLE_DETAILED_LOGGING) {
      console.log(`✅ JWT Auth: User ${decoded.email} authenticated for ${request.method} ${request.url}`);
    }

  } catch (error) {
    // Log authentication failure
    console.warn(`🚫 JWT Auth failed for ${request.method} ${request.url}:`, 
      error instanceof Error ? error.message : 'Unknown error'
    );

    reply.status(401).send({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired authentication token'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: (request as any).requestContext?.requestId,
      }
    });
    return;
  }
}

/**
 * Check if the route is public (doesn't require authentication)
 */
function isPublicRoute(url: string, method: string): boolean {
  // SIMPLIFIED: Direct checks for better reliability
  
  // Health checks
  if ((url === '/health' || url === '/') && method === 'GET') {
    return true;
  }
  
  // Auth endpoints
  if (url.startsWith('/api/v1/auth/')) {
    return true;
  }
  
  // Public properties endpoints
  if (url === '/api/v1/properties' && method === 'GET') {
    return true;
  }
  if (url === '/api/v1/properties/search' && method === 'GET') {
    return true;
  }
  
  // UPLOADS - Most important fix
  if (method === 'GET' && (url === '/uploads' || url.startsWith('/uploads/'))) {
    console.log(`✅ Auth: ${url} is a public upload route`);
    return true;
  }
  
  return false;
}

/**
 * Get JWT secret from environment or auth service
 */
function getJWTSecret(): string {
  // Try to get from environment first
  const secret = process.env.JWT_SECRET;
  if (secret) {
    return secret;
  }

  // Fallback - this should be configured properly
  throw new Error('JWT_SECRET not configured in API Gateway');
}

/**
 * Permission check middleware factory
 */
export function requirePermissions(requiredPermissions: string[]) {
  return async (request: AuthenticatedRequest, reply: FastifyReply) => {
    if (!request.user) {
      reply.status(401).send({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required'
        }
      });
      return;
    }

    const userPermissions = request.user.permissions || [];
    
    // Super admin has all permissions
    if (userPermissions.includes('*')) {
      return;
    }

    // Check if user has required permissions
    const hasPermission = requiredPermissions.some(permission => 
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      reply.status(403).send({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to access this resource'
        },
        meta: {
          requiredPermissions,
          userPermissions: userPermissions.filter(p => p !== '*'), // Don't expose wildcard
        }
      });
      return;
    }
  };
}

/**
 * Role check middleware factory
 */
export function requireRole(allowedRoles: string[]) {
  return async (request: AuthenticatedRequest, reply: FastifyReply) => {
    if (!request.user) {
      reply.status(401).send({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required'
        }
      });
      return;
    }

    if (!allowedRoles.includes(request.user.role)) {
      reply.status(403).send({
        success: false,
        error: {
          code: 'INSUFFICIENT_ROLE',
          message: 'Your role does not have access to this resource'
        },
        meta: {
          requiredRoles: allowedRoles,
          userRole: request.user.role,
        }
      });
      return;
    }
  };
}
