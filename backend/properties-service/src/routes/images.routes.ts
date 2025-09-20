import { PrismaClient } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { z } from 'zod';
import { createImageService } from '../services/image.service.js';
import { storageService } from '../services/storage.service.js';
import { logger } from '../utils/logger.js';

// Validation schemas
const uploadImageSchema = z.object({
  propertyId: z.string().uuid(),
  alt: z.string().optional(),
  order: z.coerce.number().int().min(0).optional(),
});

const updateImageSchema = z.object({
  alt: z.string().optional(),
  order: z.coerce.number().int().min(0).optional(),
});

const reorderImagesSchema = z.object({
  images: z.array(z.object({
    id: z.string().uuid(),
    order: z.coerce.number().int().min(0),
  })).min(1),
});

// Type definitions for request params
interface PropertyParams {
  propertyId: string;
}

interface ImageParams {
  id: string;
}

interface UploadBody {
  alt?: string;
  order?: number;
}

interface ReorderBody {
  images: Array<{
    id: string;
    order: number;
  }>;
}

export async function imageRoutes(fastify: FastifyInstance) {
  const prisma = fastify.prisma as PrismaClient;
  const imageService = createImageService(prisma);

  // Upload image for property
  fastify.post<{
    Params: PropertyParams;
  }>('/api/v1/properties/:propertyId/images', {
    schema: {
      params: {
        type: 'object',
        properties: {
          propertyId: { type: 'string', format: 'uuid' }
        },
        required: ['propertyId']
      }
    },
    preHandler: async (request, reply) => {
      console.log('🆕 Recebida requisição POST para upload de imagem:', {
        propertyId: request.params.propertyId,
        method: request.method,
        url: request.url,
        headers: {
          'content-type': request.headers['content-type'],
          'content-length': request.headers['content-length']
        }
      });
    }
  }, async (request, reply) => {
    try {
      const { propertyId } = request.params;
      console.log('🚀 Starting image upload for property:', propertyId);

      // Get multipart data with enhanced timeout protection
      let data: any;
      try {
        console.log('📁 Iniciando processamento do arquivo multipart...');

        // Check if request has multipart data
        console.log('🔍 Checking multipart request:', {
          isMultipart: request.isMultipart(),
          contentType: request.headers['content-type'],
          method: request.method,
          url: request.url
        });

        if (!request.isMultipart()) {
          console.log('❌ Request is not multipart');
          return reply.code(400).send({
            success: false,
            error: 'Bad Request',
            message: 'Request must be multipart/form-data'
          });
        }

        console.log('🔄 Tentando ler arquivo multipart...');
        const filePromise = request.file();
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('File read timeout')), 60000); // 60 segundos
        });

        data = await Promise.race([filePromise, timeoutPromise]);
        console.log('✅ Arquivo multipart lido com sucesso');

        console.log('📁 Arquivo multipart processado:', {
          filename: data?.filename,
          mimetype: data?.mimetype,
          size: data?.file?.bytesRead || 'unknown',
          hasFile: !!data?.file,
          fileDestroyed: data?.file?.destroyed,
          fileReadable: data?.file?.readable,
          encoding: data?.encoding,
          fields: Object.keys(data?.fields || {})
        });

        // Validar se file stream está em condições de ser processado
        if (data?.file?.destroyed || !data?.file?.readable) {
          console.log('❌ File stream is not readable or was destroyed');
          return reply.code(400).send({
            success: false,
            error: 'Bad Request',
            message: 'File stream is corrupted or already consumed'
          });
        }
      } catch (fileError) {
        console.error('❌ File read error:', {
          error: fileError instanceof Error ? fileError.message : 'Unknown error',
          stack: fileError instanceof Error ? fileError.stack : undefined,
          name: fileError instanceof Error ? fileError.name : 'Unknown'
        });

        if (fileError instanceof Error && fileError.message.includes('timeout')) {
          return reply.code(408).send({
            success: false,
            error: 'Request Timeout',
            message: 'File upload timed out - file may be too large or corrupted'
          });
        }

        return reply.code(400).send({
          success: false,
          error: 'Bad Request', 
          message: 'Failed to process uploaded file'
        });
      }

      if (!data) {
        console.log('❌ No file uploaded');
        return reply.code(400).send({
          success: false,
          error: 'Bad Request',
          message: 'No file uploaded'
        });
      }

      // Validate file stream
      if (!data.file || data.file.destroyed) {
        console.log('❌ Invalid file stream');
        return reply.code(400).send({
          success: false,
          error: 'Bad Request',
          message: 'Invalid file stream'
        });
      }

      console.log('📁 File received:', {
        filename: data.filename,
        mimetype: data.mimetype,
        size: data.file.bytesRead || 'unknown',
        streamDestroyed: data.file.destroyed
      });

      // Validate file
      const fileSize = data.file.bytesRead || 0;
      console.log('🔍 Validating file:', { 
        mimetype: data.mimetype, 
        size: fileSize,
        filename: data.filename 
      });
      
      const validation = storageService.validateImageFile(data.mimetype, fileSize);
      if (!validation.valid) {
        console.log('❌ File validation failed:', validation.error);
        return reply.code(400).send({
          success: false,
          error: 'File Validation Failed',
          message: validation.error,
          details: {
            filename: data.filename,
            mimetype: data.mimetype,
            size: fileSize
          }
        });
      }

      console.log('✅ File validation passed');

      // Get additional fields from form data
      const fields = data.fields;
      console.log('📋 Campos do formulário recebidos:', Object.keys(fields || {}));

      const getFieldValue = (field: any): string | undefined => {
        if (!field) return undefined;
        if (Array.isArray(field)) return field[0]?.value;
        return field.value;
      };

      const uploadData = {
        propertyId,
        alt: getFieldValue(fields.alt),
        order: getFieldValue(fields.order) ? parseInt(getFieldValue(fields.order)!) : undefined,
      };

      console.log('📝 Upload data processada:', uploadData);

      // Validate upload data
      const validatedData = uploadImageSchema.parse(uploadData);
      console.log('✅ Data validation passed');

      // Upload image - TODO: Integrate with media service instead of local storage
      console.log('🔄 Starting image upload to storage...');
      const image = await imageService.uploadPropertyImage(
        data.file,
        data.filename,
        data.mimetype,
        validatedData
      );

      console.log('✅ Image uploaded successfully:', { 
        id: image.id,
        url: image.url,
        propertyId: image.propertyId 
      });

      return reply.code(201).send({
        success: true,
        data: {
          id: image.id,
          url: image.url,
          alt: image.alt,
          order: image.order,
          propertyId: image.propertyId,
          createdAt: image.createdAt,
        },
        message: 'Image uploaded successfully',
      });

    } catch (error) {
      console.error('💥 Upload failed:', error);

      if (error instanceof z.ZodError) {
        console.log('❌ Validation error:', error.errors);
        return reply.code(400).send({
          success: false,
          error: 'Validation Error',
          message: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
        });
      }

      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          return reply.code(408).send({
            success: false,
            error: 'Request Timeout',
            message: 'Upload timed out. File may be too large or corrupted.'
          });
        }

        if (error.message.includes('not found')) {
          return reply.code(404).send({
            success: false,
            error: 'Not Found',
            message: 'Property not found'
          });
        }

        if (error.message.includes('storage') || error.message.includes('write')) {
          return reply.code(500).send({
            success: false,
            error: 'Storage Error',
            message: 'Failed to save image to storage'
          });
        }
      }

      return reply.code(500).send({
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to upload image'
      });
    }
  });

  // Get all images for a property
  fastify.get<{
    Params: PropertyParams;
  }>('/api/v1/properties/:propertyId/images', {
    schema: {
      params: {
        type: 'object',
        properties: {
          propertyId: { type: 'string', format: 'uuid' }
        },
        required: ['propertyId']
      }
    }
  }, async (request, reply) => {
    try {
      const { propertyId } = request.params;
      const images = await imageService.getPropertyImages(propertyId);

      return reply.send({
        success: true,
        data: images,
      });

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        propertyId: request.params.propertyId,
      }, 'Failed to get property images');

      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve images'
      });
    }
  });

  // Update image metadata
  fastify.put<{
    Params: ImageParams;
    Body: UploadBody;
  }>('/api/v1/images/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          alt: { type: 'string' },
          order: { type: 'number', minimum: 0 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const updateData = updateImageSchema.parse(request.body);

      const image = await imageService.updatePropertyImage(id, updateData);

      return reply.send({
        success: true,
        data: image,
      });

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        imageId: request.params.id,
      }, 'Failed to update image');

      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation Error',
          message: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
        });
      }

      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to update image'
      });
    }
  });

  // Delete image
  fastify.delete<{
    Params: ImageParams;
  }>('/api/v1/images/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      await imageService.deletePropertyImage(id);

      return reply.code(204).send();

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        imageId: request.params.id,
      }, 'Failed to delete image');

      if (error instanceof Error && error.message.includes('not found')) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Image not found'
        });
      }

      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to delete image'
      });
    }
  });

  // Reorder property images
  fastify.put<{
    Params: PropertyParams;
    Body: ReorderBody;
  }>('/api/v1/properties/:propertyId/images/reorder', {
    schema: {
      params: {
        type: 'object',
        properties: {
          propertyId: { type: 'string', format: 'uuid' }
        },
        required: ['propertyId']
      },
      body: {
        type: 'object',
        properties: {
          images: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                order: { type: 'number', minimum: 0 }
              },
              required: ['id', 'order']
            },
            minItems: 1
          }
        },
        required: ['images']
      }
    }
  }, async (request, reply) => {
    try {
      const { propertyId } = request.params;
      const { images } = reorderImagesSchema.parse(request.body);

      await imageService.reorderPropertyImages(propertyId, images);

      return reply.send({
        success: true,
        message: 'Images reordered successfully',
      });

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        propertyId: request.params.propertyId,
      }, 'Failed to reorder images');

      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation Error',
          message: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
        });
      }

      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to reorder images'
      });
    }
  });

  // Get single image details
  fastify.get<{
    Params: ImageParams;
  }>('/api/v1/images/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const image = await imageService.getImageById(id);

      if (!image) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Image not found'
        });
      }

      return reply.send({
        success: true,
        data: image,
      });

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        imageId: request.params.id,
      }, 'Failed to get image details');

      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve image details'
      });
    }
  });

  // Debug endpoint for testing basic upload functionality
  fastify.post('/api/v1/test-upload', async (request, reply) => {
    try {
      console.log('🧪 Starting basic upload test...');

      if (!request.isMultipart()) {
        return reply.code(400).send({
          success: false,
          error: 'Bad Request',
          message: 'Request must be multipart/form-data'
        });
      }

      const data = await request.file();
      if (!data) {
        return reply.code(400).send({
          success: false,
          error: 'Bad Request',
          message: 'No file uploaded'
        });
      }

      console.log('📁 Basic upload test - file received:', {
        filename: data.filename,
        mimetype: data.mimetype,
        size: data.file?.bytesRead || 'unknown'
      });

      // Simple file copy without processing
      const testDir = path.join(process.cwd(), 'uploads', 'test');
      if (!existsSync(testDir)) {
        mkdirSync(testDir, { recursive: true });
      }

      const testPath = path.join(testDir, `test-${Date.now()}-${data.filename}`);
      const writeStream = createWriteStream(testPath);

      await new Promise<void>((resolve, reject) => {
        data.file.pipe(writeStream);
        writeStream.on('finish', () => resolve());
        writeStream.on('error', reject);
      });

      console.log('✅ Basic upload test completed:', {
        testPath,
        size: data.file.bytesRead
      });

      return reply.send({
        success: true,
        message: 'Basic upload test successful',
        data: {
          filename: data.filename,
          size: data.file.bytesRead,
          testPath: testPath.replace(process.cwd(), ''),
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('💥 Basic upload test failed:', error);
      return reply.code(500).send({
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Test failed'
      });
    }
  });
}
