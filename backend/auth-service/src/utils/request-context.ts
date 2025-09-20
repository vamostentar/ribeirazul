import type { RequestContext } from '@/types/common';
import type { FastifyRequest } from 'fastify';
import { generateUUID } from './crypto';

/**
 * Create a new request context from Fastify request
 */
export function createRequestContext(request: FastifyRequest): RequestContext {
  const requestId = request.id || generateUUID();
  const correlationId = (request.headers['x-correlation-id'] as string) || 
                       (request.headers['x-request-id'] as string) || 
                       requestId;

  return {
    requestId,
    correlationId,
    userId: request.user?.id,
    userRole: request.user?.role,
    ipAddress: getClientIP(request),
    userAgent: request.headers['user-agent'],
    startTime: Date.now(),
    endpoint: request.url,
    method: request.method,
  };
}

/**
 * Get request context from Fastify request
 */
export function getRequestContext(request: FastifyRequest): RequestContext | undefined {
  return request.requestContext;
}

/**
 * Update request context with user information after authentication
 */
export function updateRequestContextWithUser(
  request: FastifyRequest, 
  userId: string, 
  userRole: string
): void {
  if (request.requestContext) {
    request.requestContext.userId = userId;
    request.requestContext.userRole = userRole;
  }
}

/**
 * Get client IP address from request, considering proxies
 */
export function getClientIP(request: FastifyRequest): string {
  // Check for forwarded headers (when behind proxy/load balancer)
  const forwardedFor = request.headers['x-forwarded-for'] as string;
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first (original client)
    return forwardedFor.split(',')[0].trim();
  }

  // Check for real IP header
  const realIP = request.headers['x-real-ip'] as string;
  if (realIP) {
    return realIP;
  }

  // Check for Cloudflare connecting IP
  const cfConnectingIP = request.headers['cf-connecting-ip'] as string;
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  // Fall back to connection remote address
  return request.socket.remoteAddress || 'unknown';
}

/**
 * Get user agent from request
 */
export function getUserAgent(request: FastifyRequest): string | undefined {
  return request.headers['user-agent'];
}

/**
 * Parse user agent to extract device/browser information
 */
export function parseUserAgent(userAgent?: string): {
  browser?: string;
  version?: string;
  os?: string;
  device?: string;
  isMobile: boolean;
  isBot: boolean;
} {
  if (!userAgent) {
    return { isMobile: false, isBot: false };
  }

  const ua = userAgent.toLowerCase();
  
  // Detect bots
  const botPatterns = ['bot', 'crawler', 'spider', 'scraper', 'curl', 'wget', 'python'];
  const isBot = botPatterns.some(pattern => ua.includes(pattern));

  // Detect mobile
  const mobilePatterns = ['mobile', 'android', 'iphone', 'ipad', 'tablet'];
  const isMobile = mobilePatterns.some(pattern => ua.includes(pattern));

  // Extract browser info (basic)
  let browser, version;
  if (ua.includes('chrome')) {
    browser = 'Chrome';
    const match = ua.match(/chrome\/(\d+)/);
    version = match ? match[1] : undefined;
  } else if (ua.includes('firefox')) {
    browser = 'Firefox';
    const match = ua.match(/firefox\/(\d+)/);
    version = match ? match[1] : undefined;
  } else if (ua.includes('safari')) {
    browser = 'Safari';
    const match = ua.match(/version\/(\d+)/);
    version = match ? match[1] : undefined;
  } else if (ua.includes('edge')) {
    browser = 'Edge';
    const match = ua.match(/edge\/(\d+)/);
    version = match ? match[1] : undefined;
  }

  // Extract OS info (basic)
  let os;
  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('mac')) os = 'macOS';
  else if (ua.includes('linux')) os = 'Linux';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('ios')) os = 'iOS';

  // Extract device info (basic)
  let device;
  if (ua.includes('iphone')) device = 'iPhone';
  else if (ua.includes('ipad')) device = 'iPad';
  else if (ua.includes('android')) device = 'Android Device';
  else if (isMobile) device = 'Mobile Device';
  else device = 'Desktop';

  return {
    browser,
    version,
    os,
    device,
    isMobile,
    isBot,
  };
}

/**
 * Get geolocation information from IP address
 * Note: This is a placeholder - in production you'd use a service like MaxMind GeoIP
 */
export async function getLocationFromIP(ipAddress: string): Promise<{
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
} | null> {
  // Skip for local/private IPs
  if (isPrivateIP(ipAddress)) {
    return { country: 'Local', city: 'Local Network' };
  }

  try {
    // In a real implementation, you would use a GeoIP service here
    // For now, return null to indicate geolocation is not available
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Check if IP address is private/local
 */
export function isPrivateIP(ip: string): boolean {
  // IPv4 private ranges
  const privateRanges = [
    /^127\./, // 127.0.0.0/8 (localhost)
    /^10\./, // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
    /^192\.168\./, // 192.168.0.0/16
    /^169\.254\./, // 169.254.0.0/16 (link-local)
    /^::1$/, // IPv6 localhost
    /^fc00:/, // IPv6 unique local addresses
    /^fe80:/, // IPv6 link-local addresses
  ];

  return privateRanges.some(range => range.test(ip));
}

/**
 * Generate correlation ID for distributed tracing
 */
export function generateCorrelationId(): string {
  return generateUUID();
}

/**
 * Extract trace information from headers
 */
export function extractTraceInfo(request: FastifyRequest): {
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;
} {
  const headers = request.headers;
  
  // OpenTelemetry format
  const traceParent = headers['traceparent'] as string;
  if (traceParent) {
    const parts = traceParent.split('-');
    if (parts.length >= 4) {
      return {
        traceId: parts[1],
        spanId: parts[2],
        parentSpanId: parts[2],
      };
    }
  }

  // Custom headers
  return {
    traceId: headers['x-trace-id'] as string,
    spanId: headers['x-span-id'] as string,
    parentSpanId: headers['x-parent-span-id'] as string,
  };
}

/**
 * Create response headers for tracing
 */
export function createTraceHeaders(context: RequestContext): Record<string, string> {
  const headers: Record<string, string> = {};

  if (context.requestId) {
    headers['x-request-id'] = context.requestId;
  }

  if (context.correlationId) {
    headers['x-correlation-id'] = context.correlationId;
  }

  return headers;
}

/**
 * Sanitize request context for logging (remove sensitive data)
 */
export function sanitizeRequestContext(context: RequestContext): Partial<RequestContext> {
  return {
    requestId: context.requestId,
    correlationId: context.correlationId,
    userId: context.userId,
    userRole: context.userRole,
    ipAddress: context.ipAddress ? maskIP(context.ipAddress) : undefined,
    startTime: context.startTime,
    endpoint: context.endpoint,
    method: context.method,
  };
}

/**
 * Mask IP address for privacy (keep first 3 octets for IPv4)
 */
export function maskIP(ip: string): string {
  if (ip.includes('.')) {
    // IPv4
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
    }
  } else if (ip.includes(':')) {
    // IPv6
    const parts = ip.split(':');
    if (parts.length >= 4) {
      return `${parts[0]}:${parts[1]}:${parts[2]}:${parts[3]}::xxxx`;
    }
  }
  
  return 'xxx.xxx.xxx.xxx';
}

/**
 * Calculate request duration
 */
export function getRequestDuration(context: RequestContext): number {
  return Date.now() - context.startTime;
}

/**
 * Check if request is from a trusted source
 */
export function isTrustedRequest(request: FastifyRequest): boolean {
  const trustedIPs = ['127.0.0.1', '::1']; // Add your trusted IPs
  const clientIP = getClientIP(request);
  
  return trustedIPs.includes(clientIP) || isPrivateIP(clientIP);
}

/**
 * Extract API version from request
 */
export function getApiVersion(request: FastifyRequest): string | undefined {
  // Check header first
  const versionHeader = request.headers['x-api-version'] as string;
  if (versionHeader) return versionHeader;
  
  // Check URL path
  const pathMatch = request.url.match(/^\/api\/v(\d+)/);
  if (pathMatch) return pathMatch[1];
  
  // Default version
  return '1';
}


