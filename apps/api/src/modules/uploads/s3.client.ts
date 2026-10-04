// apps/api/src/modules/uploads/s3.client.ts
import { randomBytes } from 'crypto';

import {
  DeleteObjectCommand,
  HeadObjectCommand,
  type HeadObjectCommandOutput,
  PutObjectCommand,
  S3Client as AwsS3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { env } from '@/config/env';
import { logger } from '@/config/logger';
import { createError } from '@/middleware/error';

export interface ObjectStorage {
  getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn?: number
  ): Promise<{ uploadUrl: string; publicUrl: string }>;
  uploadFile(
    key: string,
    body: Buffer,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<string>;
  deleteFile(key: string): Promise<void>;
  getFileInfo(key: string): Promise<HeadObjectCommandOutput>;
  generateFileKey(userId: string, originalName: string, prefix?: string): string;
  publicUrlFor(key: string): string;
}

const sanitizeName = (name: string): string =>
  name
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(0, 120);

/**
 * Thin wrapper over AWS SDK v3 that also speaks to any S3-compatible endpoint
 * (Cloudflare R2, MinIO). The client is created lazily so the API boots, and
 * the test suite runs, without storage credentials; only upload routes need them.
 */
class S3Storage implements ObjectStorage {
  private client: AwsS3Client | null = null;
  private readonly bucket: string | undefined;
  private readonly endpoint: string | undefined;

  constructor() {
    this.endpoint = env.R2_ENDPOINT;
    this.bucket = env.R2_ENDPOINT ? env.R2_BUCKET : env.AWS_S3_BUCKET;
  }

  private get s3(): AwsS3Client {
    if (this.client) return this.client;
    if (!this.bucket) {
      throw createError('Object storage is not configured', 503);
    }
    this.client = this.endpoint
      ? new AwsS3Client({
          endpoint: this.endpoint,
          region: 'auto',
          forcePathStyle: true,
          credentials: {
            accessKeyId: env.R2_ACCESS_KEY_ID ?? '',
            secretAccessKey: env.R2_SECRET_ACCESS_KEY ?? '',
          },
        })
      : new AwsS3Client({
          region: env.AWS_REGION,
          ...(env.AWS_ACCESS_KEY_ID &&
            env.AWS_SECRET_ACCESS_KEY && {
              credentials: { accessKeyId: env.AWS_ACCESS_KEY_ID, secretAccessKey: env.AWS_SECRET_ACCESS_KEY },
            }),
        });
    return this.client;
  }

  publicUrlFor(key: string): string {
    const encoded = key.split('/').map(encodeURIComponent).join('/');
    return this.endpoint
      ? `${this.endpoint.replace(/\/$/, '')}/${this.bucket}/${encoded}`
      : `https://${this.bucket}.s3.${env.AWS_REGION}.amazonaws.com/${encoded}`;
  }

  async getPresignedUploadUrl(key: string, contentType: string, expiresIn = 3600) {
    try {
      const command = new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType });
      const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn });
      return { uploadUrl, publicUrl: this.publicUrlFor(key) };
    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) throw error;
      logger.error({ err: error, key }, 'failed to presign upload');
      throw createError('Failed to generate upload URL', 502);
    }
  }

  async uploadFile(key: string, body: Buffer, contentType: string, metadata?: Record<string, string>) {
    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          Metadata: metadata,
        })
      );
      return this.publicUrlFor(key);
    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) throw error;
      logger.error({ err: error, key }, 'failed to upload object');
      throw createError('Failed to upload file', 502);
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) throw error;
      logger.error({ err: error, key }, 'failed to delete object');
      throw createError('Failed to delete file', 502);
    }
  }

  async getFileInfo(key: string): Promise<HeadObjectCommandOutput> {
    try {
      return await this.s3.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) throw error;
      logger.error({ err: error, key }, 'failed to stat object');
      throw createError('Failed to get file info', 502);
    }
  }

  /** Keys are namespaced by owner so authorisation can be checked structurally. */
  generateFileKey(userId: string, originalName: string, prefix = 'uploads'): string {
    return `${prefix}/${userId}/${Date.now()}_${randomBytes(4).toString('hex')}_${sanitizeName(originalName)}`;
  }
}

export const s3Client: ObjectStorage = new S3Storage();
