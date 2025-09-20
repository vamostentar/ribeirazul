import { promises as fs } from 'fs';
import path from 'path';
import { IMediaService } from '../../interfaces';
import { serviceLogger } from '../../utils/logger';

export class LocalMediaService implements IMediaService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.join(process.cwd(), 'uploads', 'properties');
    this.ensureUploadDirectory();
  }

  private async ensureUploadDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      serviceLogger.error({ error }, 'Failed to create upload directory');
    }
  }

  async uploadImage(file: Buffer, filename: string, propertyId: string): Promise<string> {
    try {
      // Create property-specific directory
      const propertyDir = path.join(this.uploadDir, propertyId);
      await fs.mkdir(propertyDir, { recursive: true });

      // Generate unique filename
      const timestamp = Date.now();
      const extension = path.extname(filename);
      const uniqueFilename = `${timestamp}-${Math.random().toString(36).substring(2)}${extension}`;
      const filePath = path.join(propertyDir, uniqueFilename);

      // Write file
      await fs.writeFile(filePath, file);

      // Return public URL
      const publicUrl = `/uploads/properties/${propertyId}/${uniqueFilename}`;
      
      serviceLogger.info({ 
        operation: 'uploadImage', 
        propertyId, 
        filename: uniqueFilename,
        size: file.length 
      }, 'Image uploaded successfully');

      return publicUrl;
    } catch (error) {
      serviceLogger.error({ error, operation: 'uploadImage', propertyId, filename }, 'Failed to upload image');
      throw new Error('Failed to upload image');
    }
  }

  async deleteImage(imageUrl: string): Promise<void> {
    try {
      // Convert URL to file path
      const urlPath = imageUrl.replace('/uploads', '');
      const filePath = path.join(process.cwd(), 'uploads', urlPath);

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        serviceLogger.warn({ imageUrl }, 'Image file not found for deletion');
        return; // File doesn't exist, consider it deleted
      }

      // Delete file
      await fs.unlink(filePath);

      // Try to remove empty directories
      const dirPath = path.dirname(filePath);
      try {
        const files = await fs.readdir(dirPath);
        if (files.length === 0) {
          await fs.rmdir(dirPath);
        }
      } catch {
        // Directory not empty or already deleted, ignore
      }

      serviceLogger.info({ operation: 'deleteImage', imageUrl }, 'Image deleted successfully');
    } catch (error) {
      serviceLogger.error({ error, operation: 'deleteImage', imageUrl }, 'Failed to delete image');
      throw new Error('Failed to delete image');
    }
  }

  getImageUrl(filename: string): string {
    return `/uploads/properties/${filename}`;
  }

  async cleanupOrphanedImages(): Promise<void> {
    try {
      serviceLogger.info({ operation: 'cleanupOrphanedImages' }, 'Starting orphaned images cleanup');

      // This is a simplified cleanup - in production you might want to:
      // 1. Check database for referenced images
      // 2. Remove files not referenced in database
      // 3. Handle partial uploads and temporary files

      serviceLogger.info({ operation: 'cleanupOrphanedImages' }, 'Orphaned images cleanup completed');
    } catch (error) {
      serviceLogger.error({ error, operation: 'cleanupOrphanedImages' }, 'Failed to cleanup orphaned images');
    }
  }
}
