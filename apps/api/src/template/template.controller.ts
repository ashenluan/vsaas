import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('templates')
export class TemplateController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(
    @Query('category') category?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const p = page ? parseInt(page, 10) : 1;
    const ps = pageSize ? parseInt(pageSize, 10) : 40;
    const where: any = { isPublic: true };
    if (category && category !== '全部') where.category = category;
    if (type) where.type = type;
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      this.prisma.template.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip: (p - 1) * ps,
        take: ps,
      }),
      this.prisma.template.count({ where }),
    ]);

    return { items, total, page: p, pageSize: ps };
  }

  @Get('categories')
  async categories() {
    const results = await this.prisma.template.groupBy({
      by: ['category'],
      where: { isPublic: true },
      _count: true,
    });
    return results.map((r) => ({ name: r.category, count: r._count }));
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.prisma.template.findFirst({
      where: { id, isPublic: true },
    });
  }

  @Post()
  @UseGuards(JwtAuthGuard)
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
        category: body.category || '通用',
        thumbnail: body.thumbnail,
        config: body.config || {},
        isPublic: body.isPublic ?? true,
      },
    });
  }
}
