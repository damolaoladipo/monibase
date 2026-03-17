import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream, createWriteStream, existsSync, mkdirSync, unlinkSync } from 'fs';
import { pipeline } from 'stream/promises';
import { join } from 'path';
import { Readable } from 'stream';
import { IResult } from '../../common/types/result.interface';

export interface UploadFileInput {
  stream: Readable;
  mimeType: string;
  uploadId: string;
  info: { filename: string };
  size: number;
  fileType: string;
}

export interface UploadResultData {
  fileName: string;
  fileSize: number;
  fileType: string;
  mimetype: string;
  uploadId: string;
  s3Key: string;
  rawFile: string;
}

/**
 * Storage service (troott-api storage.service pattern).
 * Local filesystem adapter; can be replaced with S3 when AWS config is available.
 */
@Injectable()
export class StorageService {
  private readonly baseDir: string;

  constructor(private readonly config: ConfigService) {
    this.baseDir = this.config.get<string>('STORAGE_LOCAL_PATH', join(process.cwd(), 'uploads'));
  }

  private resolvePath(key: string): string {
    return join(this.baseDir, key);
  }

  /**
   * Upload a file stream to storage (troott-api uploadFile).
   */
  async uploadFile(data: UploadFileInput): Promise<IResult<UploadResultData>> {
    const result: IResult<UploadResultData> = {
      error: false,
      message: '',
      code: 200,
      data: {} as UploadResultData,
    };
    const { stream, mimeType, uploadId, info, size, fileType } = data;
    if (!stream || !info || !mimeType || !fileType) {
      result.error = true;
      result.code = 400;
      result.message = 'Missing required upload fields.';
      return result;
    }

    const folder = fileType;
    const key = `${folder}/${uploadId}`;
    const filePath = this.resolvePath(key);

    try {
      const dir = join(this.baseDir, folder);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      const dest = createWriteStream(filePath);
      await pipeline(stream, dest);
      result.message = 'File uploaded successfully.';
      result.data = {
        fileName: info.filename,
        fileSize: size,
        fileType,
        mimetype: mimeType,
        uploadId,
        s3Key: key,
        rawFile: filePath,
      };
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      try {
        if (existsSync(filePath)) unlinkSync(filePath);
      } catch {
        // ignore cleanup error
      }
      result.error = true;
      result.code = 500;
      result.message = message;
      return result;
    }
  }

  /**
   * Check if a file exists (troott-api exists).
   */
  async exists(key: string): Promise<IResult<{ exists: boolean }>> {
    const result: IResult<{ exists: boolean }> = {
      error: false,
      message: '',
      code: 200,
      data: { exists: false },
    };
    try {
      const path = this.resolvePath(key);
      result.data!.exists = existsSync(path);
      result.message = result.data!.exists ? 'File exists' : 'File does not exist';
      result.code = result.data!.exists ? 200 : 404;
      return result;
    } catch (err: unknown) {
      result.error = true;
      result.code = 500;
      result.message = err instanceof Error ? err.message : 'Error checking file existence';
      return result;
    }
  }

  /**
   * Get a URL for the file. For local storage returns file:// path; for S3 would return signed URL (troott-api getSignedUrl).
   */
  async getSignedUrl(key: string): Promise<IResult<{ url: string }>> {
    const result: IResult<{ url: string }> = {
      error: false,
      message: '',
      code: 200,
      data: { url: '' },
    };
    try {
      const path = this.resolvePath(key);
      if (!existsSync(path)) {
        result.error = true;
        result.code = 404;
        result.message = 'File does not exist';
        return result;
      }
      result.data!.url = `file://${path}`;
      result.message = 'URL generated successfully';
      return result;
    } catch (err: unknown) {
      result.error = true;
      result.code = 500;
      result.message = err instanceof Error ? err.message : 'Error generating URL';
      return result;
    }
  }

  /**
   * Delete a file (troott-api deleteFile).
   */
  async deleteFile(key: string): Promise<IResult<Record<string, never>>> {
    const result: IResult<Record<string, never>> = {
      error: false,
      message: '',
      code: 200,
      data: {},
    };
    try {
      const path = this.resolvePath(key);
      if (existsSync(path)) {
        unlinkSync(path);
      }
      result.message = 'File deleted successfully';
      return result;
    } catch (err: unknown) {
      result.error = true;
      result.code = 500;
      result.message = err instanceof Error ? err.message : 'Error deleting file';
      return result;
    }
  }
}
