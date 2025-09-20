import type { RequestContext } from './src/types/common';

declare module 'fastify' {
  interface FastifyRequest {
    requestContext?: RequestContext;
  }
}
