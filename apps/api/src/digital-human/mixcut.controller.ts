import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DigitalHumanService } from './digital-human.service';
import { CreateMixcutDto } from './dto/create-mixcut.dto';

@Controller('mixcut')
@UseGuards(JwtAuthGuard)
export class MixcutController {
  constructor(private readonly service: DigitalHumanService) {}

  @Post()
  create(@Req() req: any, @Body() body: CreateMixcutDto) {
    return this.service.createMixcutJob(req.user.sub, body);
  }

  @Get()
  list(@Req() req: any) {
    return this.service.listMixcutJobs(req.user.sub);
  }

  @Get('options')
  getOptions() {
    return this.service.getComposeOptions();
  }

  @Get(':id')
  get(@Req() req: any, @Param('id') id: string) {
    return this.service.getMixcutJob(req.user.sub, id);
  }
}
