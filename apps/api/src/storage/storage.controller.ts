import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StorageService } from './storage.service';
import { IMS_ALL_MEDIA_MIMES } from '../common/ims-formats';

@Controller('storage')
@UseGuards(JwtAuthGuard)
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Post('upload-url')
  @Throttle({ short: { ttl: 1000, limit: 5 }, medium: { ttl: 60000, limit: 60 } })
  getUploadUrl(
    @Req() req: any,
    @Body() body: { filename: string; contentType: string },
  ) {
    if (!body.filename || !body.contentType) {
      throw new BadRequestException('filename and contentType are required');
    }

    // Validate file format against IMS supported types
    if (!IMS_ALL_MEDIA_MIMES.has(body.contentType) && !body.contentType.startsWith('application/')) {
      const ext = body.filename.split('.').pop()?.toLowerCase() || '';
      // Allow sticker formats (png, svg, gif, webp) even if MIME doesn't match exactly
      const stickerExts = new Set(['png', 'svg', 'gif', 'webp', 'jpg', 'jpeg']);
      if (!stickerExts.has(ext)) {
        throw new BadRequestException(
          `不支持的文件格式: ${body.contentType}。支持的格式: 图片(JPG/PNG/WebP/GIF/BMP/TIFF), 视频(MP4/MOV/AVI/MKV/WebM/FLV), 音频(MP3/WAV/AAC/FLAC/M4A)`,
        );
      }
    }

    const key = this.storage.generateKey(
      `uploads/${req.user.sub}`,
      body.filename,
    );
    const result = this.storage.getPresignedUploadUrl(key, body.contentType);
    return {
      ...result,
      publicUrl: this.storage.getPublicUrl(key),
    };
  }
}
