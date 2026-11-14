import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import * as streamifier from 'streamifier';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor() {
    this.configure();
  }

  private configure() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName.trim(),
        api_key: apiKey.trim(),
        api_secret: apiSecret.trim(),
        secure: true,
      });
    }
  }

  isConfigured(): boolean {
    const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || '').trim();
    const apiKey = (process.env.CLOUDINARY_API_KEY || '').trim();
    const apiSecret = (process.env.CLOUDINARY_API_SECRET || '').trim();

    if (!cloudName || !apiKey || !apiSecret) return false;
    if (
      cloudName.startsWith('your_') ||
      apiKey.startsWith('your_') ||
      apiSecret.startsWith('your_')
    ) {
      return false;
    }
    return true;
  }

  async uploadBuffer(
    buffer: Buffer,
    folder = 'pos_n70/products',
    publicId?: string,
  ): Promise<UploadApiResponse> {
    this.configure();
    if (!this.isConfigured()) {
      throw new BadRequestException(
        'Chưa cấu hình biến môi trường CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET',
      );
    }

    return new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          ...(publicId ? { public_id: publicId, overwrite: true } : {}),
        },
        (error?: UploadApiErrorResponse, result?: UploadApiResponse) => {
          if (error) {
            this.logger.error(`Cloudinary uploadBuffer error: ${error.message}`);
            return reject(new BadRequestException(`Lỗi upload ảnh lên Cloudinary: ${error.message}`));
          }
          if (!result) {
            return reject(new BadRequestException('Cloudinary không trả về kết quả upload'));
          }
          resolve(result);
        },
      );

      streamifier.createReadStream(buffer).pipe(uploadStream);
    });
  }

  async uploadFromPathOrUrl(
    source: string,
    folder = 'pos_n70/products',
    publicId?: string,
  ): Promise<string> {
    this.configure();
    if (!this.isConfigured()) {
      throw new BadRequestException('Cloudinary credentials are not configured');
    }

    const result = await cloudinary.uploader.upload(source, {
      folder,
      resource_type: 'image',
      ...(publicId ? { public_id: publicId, overwrite: true } : {}),
    });

    return result.secure_url;
  }
}

