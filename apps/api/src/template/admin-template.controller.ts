import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('admin/templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminTemplateController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list() {
    return this.prisma.template.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post()
  async create(
    @Body()
    body: {
      name: string;
      category: string;
      thumbnail?: string;
      config: any;
      isPublic?: boolean;
    },
  ) {
    return this.prisma.template.create({
      data: {
        name: body.name,
        category: body.category,
        thumbnail: body.thumbnail,
        config: body.config || {},
        isPublic: body.isPublic ?? true,
      },
    });
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      category?: string;
      thumbnail?: string;
      config?: any;
      isPublic?: boolean;
    },
  ) {
    return this.prisma.template.update({
      where: { id },
      data: body,
    });
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.prisma.template.delete({ where: { id } });
    return { success: true };
  }
}
