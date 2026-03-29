import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StorageService } from './storage.service';

@Controller('storage')
@UseGuards(JwtAuthGuard)
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Post('upload-url')
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
