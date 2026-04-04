import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DigitalHumanService } from './digital-human.service';
import { CreateDhBatchV2Dto } from './dto/create-dh-batch-v2.dto';

@Controller('dh-batch-v2')
@UseGuards(JwtAuthGuard)
export class DhBatchV2Controller {
  constructor(private readonly service: DigitalHumanService) {}

  @Post()
  @Throttle({ short: { ttl: 10000, limit: 2 }, medium: { ttl: 60000, limit: 10 } })
  create(@Req() req: any, @Body() body: CreateDhBatchV2Dto) {
    return this.service.createDhBatchV2Job(req.user.sub, body);
  }

  @Get()
  list(@Req() req: any) {
    return this.service.listDhBatchV2Jobs(req.user.sub);
  }

  @Get('avatars')
  listBuiltinAvatars() {
    return this.service.listBuiltinAvatars();
  }

  @Get(':id')
  get(@Req() req: any, @Param('id') id: string) {
    return this.service.getDhBatchV2Job(req.user.sub, id);
  }
}
