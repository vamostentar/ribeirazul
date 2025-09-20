import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { randomUUID } from 'crypto';
import { StorageAdapter, UploadParams, UploadResult } from './storage.factory';

export class S3Storage implements StorageAdapter {
  private client: S3Client;
  private cdnBaseUrl?: string;

  constructor() {
    this.client = new S3Client({
      region: process.env.S3_REGION || 'us-east-1',
      endpoint: process.env.S3_ENDPOINT, // MinIO or custom
      forcePathStyle: !!process.env.S3_FORCE_PATH_STYLE,
      credentials: process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY ? {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      } : undefined,
    });
    this.cdnBaseUrl = process.env.CDN_BASE_URL;
  }

  async uploadStream(params: UploadParams): Promise<UploadResult> {
    const key = `${randomUUID()}.jpg`;
    const uploader = new Upload({
      client: this.client,
      params: {
        Bucket: params.bucket,
        Key: key,
        Body: params.body,
        ContentType: params.contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      } as any,
    });

    await uploader.done();

    const url = this.cdnBaseUrl 
      ? `${this.cdnBaseUrl}/${params.bucket}/${key}`
      : (process.env.S3_PUBLIC_URL ? `${process.env.S3_PUBLIC_URL}/${params.bucket}/${key}` : `https://${params.bucket}.s3.amazonaws.com/${key}`);

    return { key, bucket: params.bucket, url, contentType: params.contentType };
  }
}



