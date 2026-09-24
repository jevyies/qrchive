import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CompletedPart,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const accessKeyId = process.env.R2_ACCESS_KEY_ID || '';
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '';
export const R2_BUCKET_NAME = (process.env.R2_BUCKET_NAME || 'qrchive-2026')
  .replace(/["']/g, '')
  .trim();
export const R2_ROOT_FOLDER = (process.env.R2_ROOT_FOLDER || 'dev')
  .replace(/["']/g, '')
  .trim();
export const R2_PUBLIC_DOMAIN = (process.env.R2_PUBLIC_DOMAIN || '')
  .replace(/["']/g, '')
  .trim()
  .replace(/\/+$/, '');

// Cloudflare R2 S3-Compatible Client
export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

export class R2Service {
  /**
   * Health check to confirm R2 bucket is reachable with provided credentials
   */
  static async checkConnection(): Promise<boolean> {
    try {
      const command = new HeadBucketCommand({ Bucket: R2_BUCKET_NAME });
      await r2Client.send(command);
      return true;
    } catch (err) {
      console.error('[R2Service] Connection check failed:', err);
      return false;
    }
  }

  /**
   * Generates a unique, collision-resistant storage key for an event photo
   */
  static generateStorageKey(
    eventId: number | string,
    originalFileName: string,
    options?: {
      eventCode?: string | null;
      guestCode?: string | null;
      captureMode?: string | null;
      checkListId?: number | string | null;
      checklistId?: number | string | null;
    }
  ): string {
    const sanitizedName = originalFileName
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .toLowerCase();
    const uniqueSuffix = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const eventCode = options?.eventCode || String(eventId);
    const guestCode = options?.guestCode || 'guest';
    const captureMode = options?.captureMode;
    const checkListId = options?.checkListId ?? options?.checklistId;

    if (captureMode === 'checklist' && checkListId) {
      return `${R2_ROOT_FOLDER}/events/${eventCode}/${guestCode}/${checkListId}/${uniqueSuffix}_${sanitizedName}`;
    }

    if (captureMode === 'quick' && guestCode) {
      return `${R2_ROOT_FOLDER}/events/${eventCode}/${guestCode}/quick-snaps/${uniqueSuffix}_${sanitizedName}`;
    }

    if (guestCode) {
      return `${R2_ROOT_FOLDER}/events/${eventCode}/${guestCode}/${uniqueSuffix}_${sanitizedName}`;
    }

    return `${R2_ROOT_FOLDER}/events/${eventCode}/${uniqueSuffix}_${sanitizedName}`;
  }

  /**
   * Computes the URL of the uploaded photo.
   * If R2_PUBLIC_DOMAIN is configured with a real public CDN/r2.dev domain, uses that.
   * If R2_PUBLIC_DOMAIN points to the private S3 API (r2.cloudflarestorage.com) or is empty,
   * falls back to the backend proxy endpoint so images load properly in browsers without Authorization XML errors!
   */
  static getPublicUrl(storageKey: string, photoId?: number | string): string {
    if (R2_PUBLIC_DOMAIN && !R2_PUBLIC_DOMAIN.includes('r2.cloudflarestorage.com')) {
      return `${R2_PUBLIC_DOMAIN}/${storageKey}`;
    }
    const backendUrl = process.env.BACKEND_PUBLIC_URL || 'http://localhost:3001';
    if (photoId) {
      return `${backendUrl}/api/photos/${photoId}/file`;
    }
    return `${backendUrl}/api/photos/view/${storageKey}`;
  }

  /**
   * Initializes a multipart upload in R2
   */
  static async initMultipartUpload(
    storageKey: string,
    mimeType: string = 'image/jpeg'
  ): Promise<string> {
    const command = new CreateMultipartUploadCommand({
      Bucket: R2_BUCKET_NAME,
      Key: storageKey,
      ContentType: mimeType,
    });
    const response = await r2Client.send(command);
    if (!response.UploadId) {
      throw new Error('Failed to obtain UploadId from Cloudflare R2');
    }
    return response.UploadId;
  }

  /**
   * Uploads a single part in a multipart upload session
   */
  static async uploadPart(
    storageKey: string,
    uploadId: string,
    partNumber: number,
    body: Buffer | Uint8Array
  ): Promise<string> {
    const command = new UploadPartCommand({
      Bucket: R2_BUCKET_NAME,
      Key: storageKey,
      UploadId: uploadId,
      PartNumber: partNumber,
      Body: body,
    });
    const response = await r2Client.send(command);
    if (!response.ETag) {
      throw new Error(`Failed to upload part ${partNumber} to R2 (no ETag returned)`);
    }
    return response.ETag;
  }

  /**
   * Completes a multipart upload in R2
   */
  static async completeMultipartUpload(
    storageKey: string,
    uploadId: string,
    parts: CompletedPart[]
  ): Promise<void> {
    // S3 requires parts to be strictly ordered by PartNumber ascending
    const sortedParts = [...parts].sort(
      (a, b) => (a.PartNumber || 0) - (b.PartNumber || 0)
    );
    const command = new CompleteMultipartUploadCommand({
      Bucket: R2_BUCKET_NAME,
      Key: storageKey,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: sortedParts,
      },
    });
    await r2Client.send(command);
  }

  /**
   * Aborts an in-progress multipart upload in R2
   */
  static async abortMultipartUpload(
    storageKey: string,
    uploadId: string
  ): Promise<void> {
    const command = new AbortMultipartUploadCommand({
      Bucket: R2_BUCKET_NAME,
      Key: storageKey,
      UploadId: uploadId,
    });
    await r2Client.send(command);
  }

  /**
   * Directly uploads a whole file buffer to R2
   */
  static async putObject(
    storageKey: string,
    body: Buffer | Uint8Array,
    mimeType: string = 'image/jpeg'
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: storageKey,
      Body: body,
      ContentType: mimeType,
    });
    await r2Client.send(command);
    return this.getPublicUrl(storageKey);
  }

  /**
   * Retrieves an object stream for proxying / downloading
   */
  static async getObjectStream(storageKey: string): Promise<{
    stream: Readable;
    contentType?: string;
    contentLength?: number;
    eTag?: string;
  }> {
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: storageKey,
    });
    const response = await r2Client.send(command);
    if (!response.Body) {
      throw new Error(`Object ${storageKey} has no content in R2`);
    }
    return {
      stream: response.Body as Readable,
      contentType: response.ContentType,
      contentLength: response.ContentLength,
      eTag: response.ETag,
    };
  }

  /**
   * Retrieves object data as a memory buffer for fast, safe HTTP delivery
   */
  static async getObjectBuffer(storageKey: string): Promise<{
    buffer: Buffer;
    contentType?: string;
    contentLength?: number;
    eTag?: string;
  }> {
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: storageKey,
    });
    const response = await r2Client.send(command);
    if (!response.Body) {
      throw new Error(`Object ${storageKey} has no content in R2`);
    }
    const bytes = await (response.Body as any).transformToByteArray();
    const buffer = Buffer.from(bytes);
    return {
      buffer,
      contentType: response.ContentType,
      contentLength: buffer.length,
      eTag: response.ETag,
    };
  }

  /**
   * Deletes an object from R2
   */
  static async deleteObject(storageKey: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: storageKey,
    });
    await r2Client.send(command);
  }
}
