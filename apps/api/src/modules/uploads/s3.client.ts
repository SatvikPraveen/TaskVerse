// apps/api/src/modules/uploads/s3.client.ts
import AWS from 'aws-sdk';
import { env } from '@/config/env';
import { createError } from '@/middleware/error';
import { logger } from '@/config/logger';

class S3Client {
  private s3: AWS.S3;
  private bucket: string;

  constructor() {
    // Configure AWS SDK
    if (env.R2_ENDPOINT) {
      // Cloudflare R2 configuration
      this.s3 = new AWS.S3({
        endpoint: env.R2_ENDPOINT,
        accessKeyId: env.R2_ACCESS_KEY_ID!,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
        region: 'auto',
        signatureVersion: 'v4',
        s3ForcePathStyle: true,
      });
      this.bucket = env.R2_BUCKET!;
    } else {
      // AWS S3 configuration
      this.s3 = new AWS.S3({
        accessKeyId: env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
        region: env.AWS_REGION,
        signatureVersion: 'v4',
      });
      this.bucket = env.AWS_S3_BUCKET!;
    }
  }

  async getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn: number = 3600
  ): Promise<{ uploadUrl: string; publicUrl: string }> {
    try {
      const params = {
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
        Expires: expiresIn,
        ACL: 'public-read',
      };

      const uploadUrl = await this.s3.getSignedUrlPromise('putObject', params);
      const publicUrl = env.R2_ENDPOINT
        ? `${env.R2_ENDPOINT}/${this.bucket}/${key}`
        : `https://${this.bucket}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;

      return { uploadUrl, publicUrl };
    } catch (error) {
      logger.error('Error generating presigned URL:', error);
      throw createError('Failed to generate upload URL', 500);
    }
  }

  async uploadFile(
    key: string,
    buffer: Buffer,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<string> {
    try {
      const params = {
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ACL: 'public-read',
        ...(metadata && { Metadata: metadata }),
      };

      await this.s3.upload(params).promise();

      const publicUrl = env.R2_ENDPOINT
        ? `${env.R2_ENDPOINT}/${this.bucket}/${key}`
        : `https://${this.bucket}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;

      return publicUrl;
    } catch (error) {
      logger.error('Error uploading file:', error);
      throw createError('Failed to upload file', 500);
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const params = {
        Bucket: this.bucket,
        Key: key,
      };

      await this.s3.deleteObject(params).promise();
    } catch (error) {
      logger.error('Error deleting file:', error);
      throw createError('Failed to delete file', 500);
    }
  }

  async getFileInfo(key: string): Promise<AWS.S3.HeadObjectOutput> {
    try {
      const params = {
        Bucket: this.bucket,
        Key: key,
      };

      return await this.s3.headObject(params).promise();
    } catch (error) {
      logger.error('Error getting file info:', error);
      throw createError('Failed to get file info', 500);
    }
  }

  generateFileKey(userId: string, originalName: string, prefix = 'uploads'): string {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `${prefix}/${userId}/${timestamp}_${randomSuffix}_${sanitizedName}`;
  }

  extractKeyFromUrl(url: string): string {
    // Extract key from full URL
    const baseUrl = env.R2_ENDPOINT
      ? `${env.R2_ENDPOINT}/${this.bucket}/`
      : `https://${this.bucket}.s3.${env.AWS_REGION}.amazonaws.com/`;
    
    return url.replace(baseUrl, '');
  }
}

export const s3Client = new S3Client();