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
  clone(@Req() req: any, @Body() body: CloneVoiceDto) {
    return this.service.cloneVoice(req.user.sub, body.name, body.sampleUrl);
  }

  @Post('preview')
  preview(@Req() req: any, @Body() body: PreviewVoiceDto) {
    return this.service.previewVoice(req.user.sub, body.voiceId, body.text, body.voiceType);
  }

  @Delete(':id')
  delete(@Req() req: any, @Param('id') id: string) {
    return this.service.deleteVoice(req.user.sub, id);
  }
}
