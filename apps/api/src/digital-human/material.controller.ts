import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DigitalHumanService } from './digital-human.service';
import { CreateMaterialDto, DetectFaceDto } from './dto/material.dto';

@Controller('materials')
@UseGuards(JwtAuthGuard)
export class MaterialController {
  constructor(private readonly service: DigitalHumanService) {}

  @Get()
  list(@Req() req: any, @Query('type') type?: string) {
    return this.service.listMaterials(req.user.sub, type);
  }

  @Post()
  create(@Req() req: any, @Body() body: CreateMaterialDto) {
    return this.service.createMaterial(req.user.sub, body);
  }

  @Post('detect-face')
  detectFace(@Req() req: any, @Body() body: DetectFaceDto) {
    return this.service.detectFace(req.user.sub, body.materialId || '', body.imageUrl);
  }

  @Delete(':id')
  delete(@Req() req: any, @Param('id') id: string) {
    return this.service.deleteMaterial(req.user.sub, id);
  }
}
