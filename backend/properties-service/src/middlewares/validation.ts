import { FastifyReply, FastifyRequest } from 'fastify';
import { ZodSchema } from 'zod';
import { validateInput, validateUUID } from '../utils/validation';

// Generic validation middleware factory
export function createValidationMiddleware<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      request.body = validateInput(schema, request.body);
    } catch (error) {
      return reply.send(error);
    }
  };
}

// Query validation middleware factory
export function createQueryValidationMiddleware<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      request.query = validateInput(schema, request.query);
    } catch (error) {
      return reply.send(error);
    }
  };
}

// Params validation middleware factory
export function createParamsValidationMiddleware<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      request.params = validateInput(schema, request.params);
    } catch (error) {
      return reply.send(error);
    }
  };
}

// UUID validation middleware for route parameters
export async function validateIdParam(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = request.params as { id: string };
    validateUUID(id);
  } catch (error) {
    return reply.send(error);
  }
}

// Sanitization middleware
export async function sanitizeInput(request: FastifyRequest, reply: FastifyReply) {
  if (request.body && typeof request.body === 'object') {
    const sanitizedBody = sanitizeObject(request.body);
    request.body = sanitizedBody;
  }
}

function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  if (typeof obj === 'string') {
    return obj.trim();
  }
  
  return obj;
}
