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
import { CreateComposeDto } from './dto/create-compose.dto';

@Controller('compose')
@UseGuards(JwtAuthGuard)
export class ComposeController {
  constructor(private readonly service: DigitalHumanService) {}

  @Get()
  list(@Req() req: any) {
    return this.service.listComposeJobs(req.user.sub);
  }

  @Post()
  create(@Req() req: any, @Body() body: CreateComposeDto) {
    return this.service.createComposeJob(req.user.sub, body);
  }

  @Get('options')
  getComposeOptions() {
    return this.service.getComposeOptions();
  }

  @Get(':id')
  get(@Req() req: any, @Param('id') id: string) {
    return this.service.getComposeJob(req.user.sub, id);
  }
}
