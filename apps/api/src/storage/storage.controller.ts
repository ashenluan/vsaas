import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StorageService } from './storage.service';

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
