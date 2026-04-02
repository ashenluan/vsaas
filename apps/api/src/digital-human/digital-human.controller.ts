import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DigitalHumanService } from './digital-human.service';
import { CreateVideoDto } from './dto/create-video.dto';

@Controller('digital-human')
@UseGuards(JwtAuthGuard)
export class DigitalHumanController {
  constructor(private readonly service: DigitalHumanService) {}

  @Post('create-video')
  @Throttle({ short: { ttl: 10000, limit: 2 }, medium: { ttl: 60000, limit: 10 } })
  createVideo(@Req() req: any, @Body() body: CreateVideoDto) {
    return this.service.createVideo(req.user.sub, body);
  }

  @Get('video/:id')
  getVideo(@Req() req: any, @Param('id') id: string) {
    return this.service.getVideo(req.user.sub, id);
  }
}
