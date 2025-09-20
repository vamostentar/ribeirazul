import { FastifyReply, FastifyRequest } from 'fastify';
import Redis from 'ioredis';
import { RateLimiterMemory, RateLimiterRedis } from 'rate-limiter-flexible';

// Rate limiter configurations for different endpoints
const rateLimiterConfigs = {
  // General API endpoints
  general: {
    points: 100,        // Number of requests
    duration: 60,       // Per 60 seconds
    blockDuration: 60,  // Block for 60 seconds if exceeded
  },
  // Authentication endpoints
  auth: {
    points: 5,
    duration: 900,      // 15 minutes
    blockDuration: 900, // Block for 15 minutes
  },
  // Search/listing endpoints
  search: {
    points: 30,
    duration: 60,
    blockDuration: 30,
  },
  // File upload endpoints
  upload: {
    points: 10,
    duration: 300,      // 5 minutes
    blockDuration: 300,
  },
  // Admin endpoints
  admin: {
    points: 200,
    duration: 60,
    blockDuration: 10,
  }
};

// Initialize rate limiters
const rateLimiters: Map<string, RateLimiterMemory | RateLimiterRedis> = new Map();

// Initialize Redis client if available
let redisClient: Redis | null = null;
if (process.env.REDIS_URL) {
  try {
    redisClient = new Redis(process.env.REDIS_URL, {
      enableOfflineQueue: false,
      maxRetriesPerRequest: 3,
    });
    
    redisClient.on('error', (err) => {
      console.error('Redis rate limiter error:', err);
      // Fall back to memory rate limiter
      initMemoryRateLimiters();
    });

    redisClient.on('connect', () => {
      console.log('Redis rate limiter connected');
      initRedisRateLimiters();
    });
  } catch (error) {
    console.error('Failed to initialize Redis for rate limiting:', error);
    initMemoryRateLimiters();
  }
} else {
  initMemoryRateLimiters();
}

function initMemoryRateLimiters() {
  Object.entries(rateLimiterConfigs).forEach(([key, config]) => {
    rateLimiters.set(key, new RateLimiterMemory(config));
  });
  console.log('Using in-memory rate limiters');
}

function initRedisRateLimiters() {
  if (!redisClient) return;

  Object.entries(rateLimiterConfigs).forEach(([key, config]) => {
    const options = {
      ...config,
      storeClient: redisClient!,
      keyPrefix: `rl:${key}:`,
    };
    rateLimiters.set(key, new RateLimiterRedis(options));
  });
  console.log('Using Redis rate limiters');
}

// Get client identifier (IP + user ID if authenticated)
function getClientId(request: FastifyRequest): string {
  const ip = request.ip || (request.socket as any)?.remoteAddress || 'unknown';
  const userId = (request as any).user?.id;
  return userId ? `${ip}:${userId}` : ip;
}

// Rate limiter middleware factory
export function createRateLimiter(type: keyof typeof rateLimiterConfigs = 'general') {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const limiter = rateLimiters.get(type);

    if (!limiter) {
      console.error(`Rate limiter not found for type: ${type}`);
      return;
    }

    const clientId = getClientId(request);

    try {
      const rateLimiterRes = await limiter.consume(clientId);

      // Add rate limit headers
      reply.header('X-RateLimit-Limit', rateLimiterConfigs[type].points);
      reply.header('X-RateLimit-Remaining', rateLimiterRes.remainingPoints);
      reply.header('X-RateLimit-Reset', new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString());

      // Continue to next handler
    } catch (rateLimiterRes: any) {
      // Rate limit exceeded
      reply.header('X-RateLimit-Limit', rateLimiterConfigs[type].points);
      reply.header('X-RateLimit-Remaining', rateLimiterRes.remainingPoints || 0);
      reply.header('X-RateLimit-Reset', new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString());
      reply.header('Retry-After', Math.round(rateLimiterRes.msBeforeNext / 1000) || 1);

      return reply.status(429).send({
        error: 'Too many requests',
        message: `Rate limit exceeded. Please try again in ${Math.round(rateLimiterRes.msBeforeNext / 1000)} seconds.`,
        retryAfter: Math.round(rateLimiterRes.msBeforeNext / 1000)
      });
    }
  };
}

// Dynamic rate limiting based on user role
export function createDynamicRateLimiter() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    let type: keyof typeof rateLimiterConfigs = 'general';

    // Determine rate limit type based on user role and endpoint
    if (request.url.startsWith('/api/auth')) {
      type = 'auth';
    } else if (request.url.startsWith('/api/admin') && user?.role === 'ADMIN') {
      type = 'admin';
    } else if (request.url.includes('/upload') || request.url.includes('/media')) {
      type = 'upload';
    } else if (request.url.includes('/search') || request.url.includes('/properties')) {
      type = 'search';
    }

    // Apply the appropriate rate limiter
    const limiter = createRateLimiter(type);
    return limiter(request, reply);
  };
}

// Endpoint to check rate limit status
export async function getRateLimitStatus(request: FastifyRequest, reply: FastifyReply) {
  const clientId = getClientId(request);
  const status: any = {};

  for (const [type, limiter] of rateLimiters.entries()) {
    try {
      const result = await limiter.get(clientId);
      status[type] = {
        points: rateLimiterConfigs[type as keyof typeof rateLimiterConfigs].points,
        consumed: result?.consumedPoints || 0,
        remaining: (rateLimiterConfigs[type as keyof typeof rateLimiterConfigs].points - (result?.consumedPoints || 0)),
        resetTime: result?.msBeforeNext ? new Date(Date.now() + result.msBeforeNext).toISOString() : null
      };
    } catch (error) {
      status[type] = { error: 'Unable to retrieve status' };
    }
  }

  return reply.send({
    clientId,
    limits: status
  });
}

// Reset rate limit for a specific client (admin only)
export async function resetRateLimit(request: FastifyRequest, reply: FastifyReply) {
  const { clientId, type } = request.body as any;

  if (!clientId || !type) {
    return reply.status(400).send({ error: 'clientId and type are required' });
  }

  const limiter = rateLimiters.get(type);
  if (!limiter) {
    return reply.status(400).send({ error: `Invalid rate limiter type: ${type}` });
  }

  try {
    await limiter.delete(clientId);
    return reply.send({ message: `Rate limit reset for ${clientId} on ${type}` });
  } catch (error) {
    return reply.status(500).send({ error: 'Failed to reset rate limit' });
  }
}

// Cleanup function
export function cleanupRateLimiters() {
  if (redisClient) {
    redisClient.disconnect();
  }
}
