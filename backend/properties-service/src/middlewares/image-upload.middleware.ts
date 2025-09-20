import { MultipartFile } from '@fastify/multipart';
import { FastifyReply, FastifyRequest } from 'fastify';
import { ServiceFactory } from '../factories/service.factory';
import { ValidationError } from '../types/common';
import { httpLogger } from '../utils/logger';

export interface ImageUploadRequest extends FastifyRequest {
  body: {
    propertyId: string;
    image: MultipartFile;
  };
}

export class ImageUploadMiddleware {
  private static serviceFactory = ServiceFactory.getInstance();

  static async handleUpload(request: ImageUploadRequest, reply: FastifyReply) {
    const startTime = Date.now();
    
    try {
      httpLogger.info({ operation: 'imageUpload' }, 'Processing image upload');

      // Validar propriedade ID
      const { propertyId } = request.body;
      if (!propertyId) {
        throw new ValidationError('Property ID is required');
      }

      // Validar arquivo
      const image = request.body.image;
      if (!image) {
        throw new ValidationError('Image file is required');
      }

      // Validar tipo de arquivo
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(image.mimetype)) {
        throw new ValidationError(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
      }

      // Validar tamanho (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (image.file.bytesRead > maxSize) {
        throw new ValidationError('File too large. Maximum size: 10MB');
      }

      // Ler arquivo
      const buffer = await image.toBuffer();
      
      // Upload via media service
      const mediaService = this.serviceFactory.createMediaService();
      const imageUrl = await mediaService.uploadImage(buffer, image.filename, propertyId);

      const responseTime = Date.now() - startTime;
      httpLogger.info({ 
        operation: 'imageUpload', 
        propertyId,
        filename: image.filename,
        size: buffer.length,
        responseTime 
      }, 'Image uploaded successfully');

      return reply.code(201).send({
        success: true,
        data: {
          imageUrl,
          filename: image.filename,
          size: buffer.length,
          propertyId,
        },
        message: 'Image uploaded successfully',
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;
      httpLogger.error({ 
        error, 
        operation: 'imageUpload', 
        responseTime 
      }, 'Failed to upload image');

      if (error instanceof ValidationError) {
        return reply.code(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            details: error.details,
          },
          timestamp: new Date().toISOString(),
        });
      }

      return reply.code(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to upload image',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  static async handleDelete(request: FastifyRequest, reply: FastifyReply) {
    const startTime = Date.now();
    
    try {
      const { imageUrl } = request.params as { imageUrl: string };
      
      if (!imageUrl) {
        throw new ValidationError('Image URL is required');
      }

      httpLogger.info({ operation: 'imageDelete', imageUrl }, 'Deleting image');

      // Delete via media service
      const mediaService = this.serviceFactory.createMediaService();
      await mediaService.deleteImage(imageUrl);

      const responseTime = Date.now() - startTime;
      httpLogger.info({ 
        operation: 'imageDelete', 
        imageUrl,
        responseTime 
      }, 'Image deleted successfully');

      return reply.code(204).send();

    } catch (error) {
      const responseTime = Date.now() - startTime;
      httpLogger.error({ 
        error, 
        operation: 'imageDelete', 
        responseTime 
      }, 'Failed to delete image');

      if (error instanceof ValidationError) {
        return reply.code(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
          },
          timestamp: new Date().toISOString(),
        });
      }

      return reply.code(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete image',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
}
