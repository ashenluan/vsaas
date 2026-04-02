import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DigitalHumanService } from './digital-human.service';
import { CloneVoiceDto } from './dto/clone-voice.dto';
import { PreviewVoiceDto } from './dto/preview-voice.dto';

@Controller('voices')
@UseGuards(JwtAuthGuard)
export class VoiceController {
  constructor(private readonly service: DigitalHumanService) {}

  @Get()
  list(@Req() req: any) {
    return this.service.listVoices(req.user.sub);
  }

  @Post('clone')
  @Throttle({ short: { ttl: 60000, limit: 3 }, medium: { ttl: 3600000, limit: 10 } })
  clone(@Req() req: any, @Body() body: CloneVoiceDto) {
    return this.service.cloneVoice(req.user.sub, body.name, body.sampleUrl);
  }

  @Post('preview')
  @Throttle({ short: { ttl: 5000, limit: 2 }, medium: { ttl: 60000, limit: 20 } })
  preview(@Req() req: any, @Body() body: PreviewVoiceDto) {
    return this.service.previewVoice(req.user.sub, body.voiceId, body.text, body.voiceType);
  }

  @Delete(':id')
  delete(@Req() req: any, @Param('id') id: string) {
    return this.service.deleteVoice(req.user.sub, id);
  }
}
