import { PrismaClient, PropertyImage } from '@prisma/client';
import { logger } from '../utils/logger';
import { storageService } from './storage.service';

export interface CreateImageData {
  propertyId: string;
  alt?: string;
  order?: number;
}

export interface UpdateImageData {
  alt?: string;
  order?: number;
}

export class ImageService {
  constructor(private prisma: PrismaClient) {}

  // Semaphore to limit concurrent uploads
  private uploadSemaphore = new Map<string, Promise<any>>();

  async uploadPropertyImage(
    fileStream: NodeJS.ReadableStream,
    originalName: string,
    mimeType: string,
    data: CreateImageData
  ): Promise<PropertyImage> {
    const { propertyId, alt, order = 0 } = data;

    // Check for concurrent uploads to the same property
    const semaphoreKey = `property-${propertyId}`;
    if (this.uploadSemaphore.has(semaphoreKey)) {
      console.log('⏳ Image Service: Waiting for concurrent upload to complete for property:', propertyId);
      await this.uploadSemaphore.get(semaphoreKey);
    }

    // Create upload promise and store in semaphore
    const uploadPromise = this.performImageUpload(fileStream, originalName, mimeType, data);
    this.uploadSemaphore.set(semaphoreKey, uploadPromise);

    try {
      const result = await uploadPromise;
      console.log('✅ Image Service: Upload completed for property:', propertyId);
      return result;
    } finally {
      // Clean up semaphore
      this.uploadSemaphore.delete(semaphoreKey);
    }
  }

  private async performImageUpload(
    fileStream: NodeJS.ReadableStream,
    originalName: string,
    mimeType: string,
    data: CreateImageData
  ): Promise<PropertyImage> {
    const { propertyId, alt, order = 0 } = data;
    console.log('🔄 Image Service: Starting upload for property:', propertyId);

    try {
      // Validate property exists
      console.log('🔍 Image Service: Validating property exists...');
      const property = await this.prisma.property.findUnique({
        where: { id: propertyId }
      });

      if (!property) {
        console.log('❌ Image Service: Property not found:', propertyId);
        throw new Error(`Property with ID ${propertyId} not found`);
      }

      console.log('✅ Image Service: Property validated:', property?.title || 'Unknown title');

      // Upload image to storage
      console.log('🔄 Image Service: Calling storage service...');
      let uploadedImage: any;
      try {
        console.log('🔄 Image Service: Storage service parameters:', {
          hasFileStream: !!fileStream,
          originalName,
          mimeType,
          streamDestroyed: (fileStream as any)?.destroyed,
          streamReadable: (fileStream as any)?.readable
        });

        uploadedImage = await storageService.uploadPropertyImage(
          fileStream,
          originalName,
          mimeType,
          {
            quality: 85,
            maxWidth: 1920,
            maxHeight: 1080,
            generateThumbnail: true,
            thumbnailWidth: 300,
            thumbnailHeight: 200,
          }
        );
        console.log('✅ Image Service: Storage upload completed:', {
          url: uploadedImage.url,
          size: uploadedImage.size,
          dimensions: `${uploadedImage.width}x${uploadedImage.height}`
        });
      } catch (uploadError) {
        console.error('❌ Image Service: Storage upload failed:', {
          error: uploadError instanceof Error ? uploadError.message : 'Unknown error',
          stack: uploadError instanceof Error ? uploadError.stack : undefined,
          propertyId,
          originalName,
          mimeType
        });
        throw new Error(`Storage upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
      }

      // If this is the first image and no order specified, make it the main image
      console.log('🔢 Image Service: Checking image count...');
      const imageCount = await this.prisma.propertyImage.count({
        where: { propertyId }
      });

      const finalOrder = order === 0 && imageCount === 0 ? 1 : order;
      console.log('🔢 Image Service: Final order:', finalOrder);

      // Save image record to database
      console.log('💾 Image Service: Saving to database...');
      const propertyImage = await this.prisma.propertyImage.create({
        data: {
          propertyId,
          url: uploadedImage.url,
          alt: alt || `${property?.title || 'Property'} - Image ${imageCount + 1}`,
          order: finalOrder,
        }
      });

      console.log('✅ Image Service: Database record created:', propertyImage.id);

      // Update property's main imageUrl if this is the first image
      if (imageCount === 0) {
        console.log('🖼️ Image Service: Setting as main image...');
        await this.prisma.property.update({
          where: { id: propertyId },
          data: { imageUrl: uploadedImage.url }
        });
        console.log('✅ Image Service: Main image updated');
      }

      console.log('🎉 Image Service: Upload completed successfully');
      return propertyImage;

    } catch (error) {
      console.error('💥 Image Service: Upload failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        propertyId,
        originalName,
        mimeType,
        errorType: error instanceof Error ? error.constructor.name : typeof error
      });

      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          throw new Error(`Upload timed out. File may be too large or network issue. Property: ${propertyId}`);
        }
        if (error.message.includes('not found')) {
          throw new Error(`Property not found: ${propertyId}`);
        }
        if (error.message.includes('storage') || error.message.includes('write')) {
          throw new Error(`Storage write error for property ${propertyId}. Check disk space and permissions`);
        }
        if (error.message.includes('Invalid file stream')) {
          throw new Error(`Invalid file received for property ${propertyId}. File may be corrupted`);
        }
        if (error.message.includes('ENOSPC')) {
          throw new Error(`Disk space full. Cannot save image for property ${propertyId}`);
        }
        if (error.message.includes('EACCES') || error.message.includes('EPERM')) {
          throw new Error(`Permission denied. Cannot write image for property ${propertyId}`);
        }
      }

      throw new Error(`Image upload failed for property ${propertyId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getPropertyImages(propertyId: string): Promise<PropertyImage[]> {
    try {
      const images = await this.prisma.propertyImage.findMany({
        where: { propertyId },
        orderBy: { order: 'asc' }
      });

      return images;

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        propertyId,
      }, 'Failed to get property images');

      throw new Error('Failed to retrieve property images');
    }
  }

  async updatePropertyImage(imageId: string, data: UpdateImageData): Promise<PropertyImage> {
    try {
      const image = await this.prisma.propertyImage.findUnique({
        where: { id: imageId }
      });

      if (!image) {
        throw new Error(`Image with ID ${imageId} not found`);
      }

      const updatedImage = await this.prisma.propertyImage.update({
        where: { id: imageId },
        data
      });

      logger.info({
        imageId,
        propertyId: image.propertyId,
        updates: data,
      }, 'Property image updated');

      return updatedImage;

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        imageId,
        data,
      }, 'Failed to update property image');

      throw error;
    }
  }

  async deletePropertyImage(imageId: string): Promise<void> {
    try {
      // Get image details before deletion
      const image = await this.prisma.propertyImage.findUnique({
        where: { id: imageId },
        include: { property: true }
      });

      if (!image) {
        throw new Error(`Image with ID ${imageId} not found`);
      }

      // Extract filename from URL
      const filename = image.url.split('/').pop();
      if (!filename) {
        throw new Error('Invalid image URL format');
      }

      // Delete from database first
      await this.prisma.propertyImage.delete({
        where: { id: imageId }
      });

      // Delete physical files
      await storageService.deletePropertyImage(imageId, filename);

      // If this was the main image, update property to use next available image
      if (image.property && image.property.imageUrl === image.url) {
        const nextImage = await this.prisma.propertyImage.findFirst({
          where: { propertyId: image.propertyId },
          orderBy: { order: 'asc' }
        });

        await this.prisma.property.update({
          where: { id: image.propertyId },
          data: { imageUrl: nextImage?.url || null }
        });
      }

      logger.info({
        imageId,
        propertyId: image.propertyId,
        filename,
      }, 'Property image deleted');

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        imageId,
      }, 'Failed to delete property image');

      throw error;
    }
  }

  async reorderPropertyImages(propertyId: string, imageOrders: { id: string; order: number }[]): Promise<void> {
    try {
      // Validate property exists
      const property = await this.prisma.property.findUnique({
        where: { id: propertyId }
      });

      if (!property) {
        throw new Error(`Property with ID ${propertyId} not found`);
      }

      // Update orders in a transaction
      await this.prisma.$transaction(async (tx) => {
        for (const { id, order } of imageOrders) {
          await tx.propertyImage.update({
            where: { 
              id,
              propertyId // Ensure image belongs to this property
            },
            data: { order }
          });
        }
      });

      // Update main image if order changed
      const mainImage = await this.prisma.propertyImage.findFirst({
        where: { propertyId },
        orderBy: { order: 'asc' }
      });

      if (mainImage && property.imageUrl !== mainImage.url) {
        await this.prisma.property.update({
          where: { id: propertyId },
          data: { imageUrl: mainImage.url }
        });
      }

      logger.info({
        propertyId,
        imageCount: imageOrders.length,
      }, 'Property images reordered');

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        propertyId,
        imageOrders,
      }, 'Failed to reorder property images');

      throw error;
    }
  }

  async getImageById(imageId: string): Promise<PropertyImage | null> {
    try {
      const image = await this.prisma.propertyImage.findUnique({
        where: { id: imageId },
        include: { property: true }
      });

      return image;

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        imageId,
      }, 'Failed to get image by ID');

      throw new Error('Failed to retrieve image');
    }
  }
}

export const createImageService = (prisma: PrismaClient) => new ImageService(prisma);
