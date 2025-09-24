import fs, { constants, createWriteStream, existsSync, mkdirSync, unlinkSync } from 'fs';
import path from 'path';
import sharp from 'sharp';
import { pipeline } from 'stream/promises';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/index';
import { logger } from '../utils/logger';

export interface ImageUploadOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  generateThumbnail?: boolean;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
}

export interface UploadedImage {
  id: string;
  originalName: string;
  filename: string;
  path: string;
  url: string;
  size: number;
  mimeType: string;
  width?: number;
  height?: number;
  thumbnail?: {
    filename: string;
    path: string;
    url: string;
  };
}

export class StorageService {
  private readonly uploadsDir: string;
  private readonly baseUrl: string;

  constructor() {
    // Use absolute path within container for uploads directory
    this.uploadsDir = path.resolve('/app/uploads');
    // Use configuration-based BASE_URL with proper fallbacks
    this.baseUrl = config.BASE_URL || process.env.API_URL || '';
    // In production behind nginx, prefer relative / absolute host from request via gateway.
    // When baseUrl is empty, we still generate relative URLs which the frontend will resolve via nginx.

    console.log('📁 Storage service initialized:', {
      uploadsDir: this.uploadsDir,
      baseUrl: this.baseUrl,
      cwd: process.cwd()
    });

    // Ensure uploads directory exists
    this.ensureUploadsDirectory();
  }

  private ensureUploadsDirectory(): void {
    const dirs = [
      this.uploadsDir,
      path.join(this.uploadsDir, 'properties'),
      path.join(this.uploadsDir, 'properties', 'images'),
      path.join(this.uploadsDir, 'properties', 'thumbnails'),
    ];

    dirs.forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
        logger.info(`Created directory: ${dir}`);
      }
      // Try to set permissions to allow writing (in case of permission issues)
      try {
        // This is a best-effort attempt and may not work on all systems
        if (process.platform !== 'win32') {
          const fsPromises = fs.promises;
          fsPromises.chmod(dir, 0o755).catch(() => {
            // Ignore permission errors during directory creation
            logger.debug(`Could not set permissions on directory: ${dir}`);
          });
        }
      } catch (error) {
        // Ignore permission errors
        logger.debug(`Could not adjust permissions on directory: ${dir}`);
      }
    });
  }

    async uploadPropertyImage(
    fileStream: NodeJS.ReadableStream,
    originalName: string,
    mimeType: string,
    options: ImageUploadOptions = {}
  ): Promise<UploadedImage> {
    console.log('🔄 Storage: Starting image upload:', { originalName, mimeType });

    const {
      quality = 85,
      maxWidth = 1920,
      maxHeight = 1080,
      generateThumbnail = true,
      thumbnailWidth = 300,
      thumbnailHeight = 200,
    } = options;

    const fileId = uuidv4();
    const fileExtension = this.getFileExtension(originalName);
    const filename = `${fileId}${fileExtension}`;
    const imagePath = path.join(this.uploadsDir, 'properties', 'images', filename);

    console.log('📁 Storage: File paths:', { fileId, filename, imagePath });

    // Declare variables for cleanup
    let writeStream: any = null;
    let thumbnailFilename = '';
    let thumbnailWriteStream: any = null;

    try {
      // Process and save the main image
      console.log('🔄 Storage: Processing image with Sharp...');
      
      // Create a more robust Sharp transformer
      const transformer = sharp({
        failOnError: false, // Don't fail on minor errors
        limitInputPixels: 268402689, // ~16K x 16K limit
        sequentialRead: true, // Better for streams
        density: 72 // Standard web density
      })
      .rotate() // Auto-rotate based on EXIF
      .resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
        kernel: sharp.kernel.lanczos3 // Better quality resizing
      })
      .jpeg({ 
        quality,
        progressive: true, // Progressive JPEG for better loading
        mozjpeg: true // Better compression
      });

      console.log('💾 Storage: Writing image to disk...');

      // Check if we can write to the directory
      try {
        const fsPromises = fs.promises;
        await fsPromises.access(path.dirname(imagePath), constants.W_OK);
        console.log('✅ Storage: Write permission confirmed for:', path.dirname(imagePath));
      } catch (accessError) {
        console.warn('⚠️ Storage: Write permission check failed:', {
          path: path.dirname(imagePath),
          error: accessError instanceof Error ? accessError.message : 'Unknown error',
          code: (accessError as any)?.code
        });

        // Try to create parent directories again
        console.log('🔄 Storage: Attempting to recreate directories...');
        this.ensureUploadsDirectory();

        // Try permission check again after directory creation
        try {
          const fsPromises = fs.promises;
          await fsPromises.access(path.dirname(imagePath), constants.W_OK);
          console.log('✅ Storage: Write permission confirmed after directory recreation');
        } catch (retryError) {
          console.error('❌ Storage: Still no write permission after directory recreation:', retryError);
        }
      }

      writeStream = createWriteStream(imagePath);
      console.log('📂 Storage: Write stream created for:', imagePath);

      // Ensure fileStream is readable and has data
      const nodeStream = fileStream as any; // Cast to Node.js stream for TypeScript
      if (!fileStream || nodeStream.destroyed || !nodeStream.readable) {
        console.error('❌ Storage: Invalid file stream detected');
        throw new Error('Invalid file stream - stream is not readable or was destroyed');
      }

      // Additional validation for file stream content
      if (nodeStream.readableLength === 0 && !nodeStream.readableFlowing) {
        console.error('❌ Storage: File stream appears to be empty');
        throw new Error('File stream is empty - no data to process');
      }

      // Log stream status
      console.log('📊 Storage: File stream status:', {
        readable: nodeStream.readable,
        destroyed: nodeStream.destroyed,
        readableHighWaterMark: nodeStream.readableHighWaterMark,
        readableLength: nodeStream.readableLength,
        isPaused: nodeStream.isPaused ? nodeStream.isPaused() : 'unknown'
      });

      // Resume stream if it's paused
      if (nodeStream.isPaused && nodeStream.isPaused()) {
        console.log('🔄 Storage: Resuming paused file stream');
        nodeStream.resume();
      }

      // Create a promise that resolves when the pipeline completes or times out
      console.log('🔄 Storage: Creating processing pipeline...');
      const pipelinePromise = pipeline(
        fileStream,
        transformer,
        writeStream
      );

      console.log('🔄 Storage: Pipeline created, waiting for completion...');

      // Add timeout to prevent infinite loops
      const timeoutPromise = new Promise<never>((_, reject) => {
        const timeoutId = setTimeout(() => {
          console.error('💥 Storage: Image processing timeout reached - 60 seconds');
          reject(new Error('Image processing timeout after 60 seconds'));
        }, 60000); // 60 segundos para processamento de imagem

        // Clear timeout if pipeline completes first
        pipelinePromise.finally(() => {
          console.log('🕐 Storage: Clearing timeout as pipeline completed');
          clearTimeout(timeoutId);
        });
      });

      try {
        console.log('🚀 Storage: Starting pipeline execution...');
        await Promise.race([pipelinePromise, timeoutPromise]);
        console.log('✅ Storage: Pipeline completed successfully');

        // Verify file was actually written
        const stats = await import('fs/promises').then(fs => fs.stat(imagePath));
        console.log('📊 Storage: File written verification:', {
          path: imagePath,
          size: stats.size,
          exists: true
        });

      } catch (pipelineError) {
        console.error('💥 Storage: Pipeline failed:', pipelineError);

        // Log detailed error information
        const nodeStreamForError = fileStream as any; // Cast to Node.js stream for TypeScript
        const errorMessage = pipelineError instanceof Error ? pipelineError.message : 'Unknown pipeline error';
        
        console.error('💥 Storage: Pipeline error details:', {
          error: errorMessage,
          stack: pipelineError instanceof Error ? pipelineError.stack : undefined,
          writeStreamDestroyed: writeStream?.destroyed,
          fileStreamDestroyed: nodeStreamForError?.destroyed,
          imagePath: imagePath,
          transformerStatus: transformer ? 'created' : 'null',
          writeStreamStatus: writeStream ? (writeStream.destroyed ? 'destroyed' : 'active') : 'null',
          mimeType,
          originalName
        });

        // Provide more specific error messages
        if (errorMessage.includes('Input buffer contains unsupported image format')) {
          console.error('🔍 Storage: Image format issue detected - this might be a corrupted file or unsupported format');
          throw new Error(`Unsupported or corrupted image format: ${originalName}. Please use JPEG, PNG, or WebP files.`);
        }
        
        if (errorMessage.includes('Input file contains unsupported image format')) {
          throw new Error(`Invalid image file: ${originalName}. File may be corrupted or not a valid image.`);
        }

        // Force close streams on error
        if (writeStream && !writeStream.destroyed) {
          writeStream.destroy();
          console.log('🧹 Storage: Write stream destroyed after error');
        }

        // Check if partial file exists and clean it up
        try {
          const fsPromises = fs.promises;
          await fsPromises.access(imagePath);
          await fsPromises.unlink(imagePath);
          console.log('🧹 Storage: Cleaned up partial file:', imagePath);
        } catch (cleanupError) {
          // Ignore if file doesn't exist
        }

        throw pipelineError;
      }

      console.log('✅ Storage: Image written successfully');

      // Get image metadata
      console.log('📊 Storage: Getting image metadata...');
      const metadata = await sharp(imagePath).metadata();
      const stats = await import('fs/promises').then(fs => fs.stat(imagePath));

      const result: UploadedImage = {
        id: fileId,
        originalName,
        filename,
        path: imagePath,
        url: this.baseUrl ? `${this.baseUrl}/uploads/properties/images/${filename}` : `/uploads/properties/images/${filename}`,
        size: stats.size,
        mimeType: 'image/jpeg',
        width: metadata.width,
        height: metadata.height,
      };

      console.log('📊 Storage: Image metadata:', {
        size: result.size,
        dimensions: `${result.width}x${result.height}`,
        url: result.url
      });

      // Generate thumbnail if requested
      if (generateThumbnail) {
        console.log('🖼️ Storage: Generating thumbnail...');
        thumbnailFilename = `thumb_${filename}`;
        const thumbnailPath = path.join(this.uploadsDir, 'properties', 'thumbnails', thumbnailFilename);

        await sharp(imagePath)
          .resize(thumbnailWidth, thumbnailHeight, { 
            fit: 'cover',
            position: 'center'
          })
          .jpeg({ quality: 75 })
          .toFile(thumbnailPath);

        result.thumbnail = {
          filename: thumbnailFilename,
          path: thumbnailPath,
          url: this.baseUrl ? `${this.baseUrl}/uploads/properties/thumbnails/${thumbnailFilename}` : `/uploads/properties/thumbnails/${thumbnailFilename}`,
        };

        console.log('✅ Storage: Thumbnail generated');
      }

      console.log('🎉 Storage: Image upload completed successfully');
      return result;

    } catch (error) {
      console.error('💥 Storage: Upload failed:', error);

      // Clean up on error - close streams and remove files
      try {
        // Close write streams if still open
        if (writeStream && !writeStream.destroyed) {
          writeStream.destroy();
          console.log('🧹 Storage: Closed main image write stream');
        }

        if (thumbnailWriteStream && !thumbnailWriteStream.destroyed) {
          thumbnailWriteStream.destroy();
          console.log('🧹 Storage: Closed thumbnail write stream');
        }

        // Close fileStream if still open
        const nodeStreamForCleanup = fileStream as any; // Cast to Node.js stream for TypeScript
        if (fileStream && !nodeStreamForCleanup.destroyed) {
          nodeStreamForCleanup.destroy();
          console.log('🧹 Storage: Closed input file stream');
        }

        // Remove partially written files
        if (existsSync(imagePath)) {
          unlinkSync(imagePath);
          console.log('🧹 Storage: Cleaned up failed image file');
        }

        // Remove thumbnail if it was partially created
        if (generateThumbnail && thumbnailFilename) {
          const thumbnailPath = path.join(this.uploadsDir, 'properties', 'thumbnails', thumbnailFilename);
          if (existsSync(thumbnailPath)) {
            unlinkSync(thumbnailPath);
            console.log('🧹 Storage: Cleaned up failed thumbnail file');
          }
        }
      } catch (cleanupError) {
        console.error('⚠️ Storage: Error during cleanup:', cleanupError);
      }

      // Handle different types of errors
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          throw new Error('Image processing timed out. The file may be too large or corrupted.');
        }
        throw new Error(`Failed to upload image: ${error.message}`);
      }

      throw new Error('Failed to upload image: Unknown error');
    }
  }

  async deletePropertyImage(imageId: string, filename: string): Promise<void> {
    try {
      const imagePath = path.join(this.uploadsDir, 'properties', 'images', filename);
      const thumbnailFilename = `thumb_${filename}`;
      const thumbnailPath = path.join(this.uploadsDir, 'properties', 'thumbnails', thumbnailFilename);

      // Delete main image
      if (existsSync(imagePath)) {
        unlinkSync(imagePath);
        logger.info({ imageId, filename }, 'Main image deleted');
      }

      // Delete thumbnail
      if (existsSync(thumbnailPath)) {
        unlinkSync(thumbnailPath);
        logger.info({ imageId, filename: thumbnailFilename }, 'Thumbnail deleted');
      }

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        imageId,
        filename,
      }, 'Failed to delete image files');

      throw new Error(`Failed to delete image files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private getFileExtension(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    
    // Always save as .jpg for consistency and compression
    const supportedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    if (supportedExtensions.includes(ext)) {
      return '.jpg';
    }
    
    throw new Error(`Unsupported file extension: ${ext}`);
  }

  getImageUrl(filename: string, thumbnail = false): string {
    const folder = thumbnail ? 'thumbnails' : 'images';
    const actualFilename = thumbnail ? `thumb_${filename}` : filename;
    return `${this.baseUrl}/uploads/properties/${folder}/${actualFilename}`;
  }

  validateImageFile(mimeType: string, fileSize: number): { valid: boolean; error?: string } {
    // Check MIME type
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp'
    ];

    if (!allowedMimeTypes.includes(mimeType)) {
      return {
        valid: false,
        error: `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`
      };
    }

    // Check file size (20MB limit)
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (fileSize > maxSize) {
      return {
        valid: false,
        error: `File too large. Maximum size: ${maxSize / (1024 * 1024)}MB`
      };
    }

    // Check minimum file size (avoid empty/corrupted files)
    const minSize = 50; // 50 bytes minimum - mais tolerante para testes
    if (fileSize < minSize) {
      return {
        valid: false,
        error: `File too small (${fileSize} bytes). Minimum size: ${minSize} bytes. This might be a corrupted or empty file.`
      };
    }

    return { valid: true };
  }

  /**
   * Validate if a buffer contains a valid image by checking magic bytes
   */
  private validateImageBuffer(buffer: Buffer): { valid: boolean; detectedType?: string; error?: string } {
    if (!buffer || buffer.length < 8) {
      return { valid: false, error: 'Buffer too small or empty' };
    }

    // Check magic bytes for different image formats
    const magicBytes = buffer.subarray(0, 8);
    
    // JPEG: FF D8 FF
    if (magicBytes[0] === 0xFF && magicBytes[1] === 0xD8 && magicBytes[2] === 0xFF) {
      return { valid: true, detectedType: 'image/jpeg' };
    }
    
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (magicBytes[0] === 0x89 && magicBytes[1] === 0x50 && magicBytes[2] === 0x4E && magicBytes[3] === 0x47) {
      return { valid: true, detectedType: 'image/png' };
    }
    
    // WebP: RIFF ... WEBP
    if (magicBytes[0] === 0x52 && magicBytes[1] === 0x49 && magicBytes[2] === 0x46 && magicBytes[3] === 0x46 &&
        buffer.length >= 12 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
      return { valid: true, detectedType: 'image/webp' };
    }

    return { valid: false, error: 'Unrecognized image format based on file header' };
  }
}

export const storageService = new StorageService();
