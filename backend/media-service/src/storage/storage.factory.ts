import { GCSStorage } from './storage.gcs';
import { S3Storage } from './storage.s3';

export interface UploadResult {
  key: string;
  bucket: string;
  url: string;
  contentType: string;
  size?: number;
}

export interface UploadParams {
  bucket: string;
  contentType: string;
  body: NodeJS.ReadableStream;
}

export interface StorageAdapter {
  uploadStream(params: UploadParams): Promise<UploadResult>;
}

function createStorage(): StorageAdapter {
  const provider = (process.env.MEDIA_STORAGE_PROVIDER || 's3').toLowerCase();
  if (provider === 'gcs') return new GCSStorage();
  return new S3Storage();
}

export const storage: StorageAdapter = createStorage();



