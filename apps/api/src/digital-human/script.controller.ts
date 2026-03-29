import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DigitalHumanService } from './digital-human.service';
import { CreateScriptDto, UpdateScriptDto } from './dto/script.dto';

@Controller('scripts')
@UseGuards(JwtAuthGuard)
export class ScriptController {
  constructor(private readonly service: DigitalHumanService) {}

  @Get()
  list(@Req() req: any) {
    return this.service.listScripts(req.user.sub);
  }

  @Post()
  create(@Req() req: any, @Body() body: CreateScriptDto) {
    return this.service.createScript(req.user.sub, body);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() body: UpdateScriptDto) {
    return this.service.updateScript(req.user.sub, id, body);
  }

  @Delete(':id')
  delete(@Req() req: any, @Param('id') id: string) {
    return this.service.deleteScript(req.user.sub, id);
  }
}
