import { Storage } from '@google-cloud/storage';
import { randomUUID } from 'crypto';
import { StorageAdapter, UploadParams, UploadResult } from './storage.factory';

export class GCSStorage implements StorageAdapter {
  private storage: Storage;
  private cdnBaseUrl?: string;

  constructor() {
    this.storage = new Storage({
      projectId: process.env.GCP_PROJECT,
      keyFilename: process.env.GCP_CREDENTIALS_JSON,
    });
    this.cdnBaseUrl = process.env.CDN_BASE_URL;
  }

  async uploadStream(params: UploadParams): Promise<UploadResult> {
    const key = `${randomUUID()}.jpg`;
    const bucket = this.storage.bucket(params.bucket);
    const file = bucket.file(key);
    await new Promise((resolve, reject) => {
      const stream = file.createWriteStream({
        contentType: params.contentType,
        resumable: false,
        metadata: {
          cacheControl: 'public, max-age=31536000, immutable',
        },
      });
      params.body.pipe(stream)
        .on('error', reject)
        .on('finish', resolve);
    });

    const url = this.cdnBaseUrl 
      ? `${this.cdnBaseUrl}/${params.bucket}/${key}`
      : `https://storage.googleapis.com/${params.bucket}/${key}`;

    return { key, bucket: params.bucket, url, contentType: params.contentType };
  }
}



