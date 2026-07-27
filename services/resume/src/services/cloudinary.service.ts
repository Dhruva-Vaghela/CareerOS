import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config.js';
import { createLogger } from '@careeros/logger';

const logger = createLogger('cloudinary-service');

cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key: config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface UploadResult {
  publicId: string;
  secureUrl: string;
  filename: string;
  mimeType: string;
  size: number;
}

export class CloudinaryService {
  async uploadBuffer(buffer: Buffer, originalname: string, mimeType: string): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'careeros/resumes',
          resource_type: mimeType === 'application/pdf' ? 'raw' : 'auto',
          public_id: `resume_${Date.now()}_${originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`,
        },
        (error, result) => {
          if (error || !result) {
            logger.warn({ err: error }, 'Cloudinary upload failed or unconfigured, utilizing dev fallback');
            if (config.NODE_ENV !== 'production') {
              const mockPublicId = `resume_${Date.now()}_${originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
              const mockUrl = `https://res.cloudinary.com/demo/image/upload/v1/resumes/${mockPublicId}`;
              return resolve({
                publicId: mockPublicId,
                secureUrl: mockUrl,
                filename: originalname,
                mimeType,
                size: buffer.length,
              });
            }
            return reject(error || new Error('Upload result is undefined'));
          }

          logger.info({ publicId: result.public_id, url: result.secure_url }, 'Cloudinary upload succeeded');
          resolve({
            publicId: result.public_id,
            secureUrl: result.secure_url,
            filename: originalname,
            mimeType,
            size: buffer.length,
          });
        },
      );

      uploadStream.end(buffer);
    });
  }

  async deleteAsset(publicId: string): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
      if (result.result === 'ok' || result.result === 'not found') {
        return true;
      }
      // Also try image/auto destroy
      await cloudinary.uploader.destroy(publicId);
      return true;
    } catch (err) {
      logger.warn({ err, publicId }, 'Failed to delete asset from Cloudinary');
      return false;
    }
  }
}
