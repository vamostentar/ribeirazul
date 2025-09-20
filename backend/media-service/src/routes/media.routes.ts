import '@fastify/multipart';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import sharp from 'sharp';
import { z } from 'zod';
import { storage } from '../storage/storage.factory';

const uploadQuerySchema = z.object({
  bucket: z.string().default('images'),
  transform: z.enum(['original', 'resize', 'cover']).default('resize'),
  width: z.coerce.number().int().positive().max(4000).default(1920),
  height: z.coerce.number().int().positive().max(4000).default(1080),
  quality: z.coerce.number().int().min(1).max(100).default(85),
});

export async function mediaRoutes(fastify: FastifyInstance) {
  // declare multipart types on instance
  
  const getFile = (req: any) => req.file();
  fastify.post('/upload', {
    schema: {
      consumes: ['multipart/form-data'],
      querystring: {
        type: 'object',
        properties: {
          bucket: { type: 'string' },
          transform: { type: 'string', enum: ['original', 'resize', 'cover'] },
          width: { type: 'number' },
          height: { type: 'number' },
          quality: { type: 'number' }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const query = uploadQuerySchema.parse(request.query);
    const file = await getFile(request as any);
    if (!file) return reply.code(400).send({ error: 'No file' });

    // Validate mimetype
    if (!/^image\/(jpeg|png|webp|avif)$/.test(file.mimetype)) {
      return reply.code(400).send({ error: 'Unsupported image type' });
    }

    let stream = file.file;
    if (query.transform !== 'original') {
      const fit = query.transform === 'cover' ? 'cover' : 'inside';
      const transformer = sharp()
        .resize(query.width, query.height, { fit, withoutEnlargement: true })
        .jpeg({ quality: query.quality });
      stream = stream.pipe(transformer as any);
    }

    const uploaded = await storage.uploadStream({
      bucket: query.bucket,
      contentType: 'image/jpeg',
      body: stream,
    });

    return reply.code(201).send({
      success: true,
      data: uploaded,
    });
  });
}

