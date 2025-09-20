import { FastifyRequest } from 'fastify';
import { RequestContext } from '@/types/common';

declare module 'fastify' {
  interface FastifyRequest {
    requestContext?: RequestContext;
  }
}
