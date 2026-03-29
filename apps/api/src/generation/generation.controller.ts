import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { GenerationService } from './generation.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateImageDto } from './dto/create-image.dto';
import { CreateVideoDto } from './dto/create-video.dto';
import { CreateAdvancedImageDto, AdvancedImageType } from './dto/create-advanced-image.dto';

@Controller('generations')
@UseGuards(JwtAuthGuard)
export class GenerationController {
  constructor(private readonly generationService: GenerationService) {}

  @Post('image')
  createImage(@Req() req: any, @Body() body: any) {
    // Route to advanced generation if body has an advanced type
    const advancedTypes = Object.values(AdvancedImageType) as string[];
    if (body.type && advancedTypes.includes(body.type)) {
      return this.generationService.createAdvancedImageGeneration(req.user.sub, body);
    }
    return this.generationService.createImageGeneration(req.user.sub, body);
  }

  @Post('video')
  createVideo(@Req() req: any, @Body() body: CreateVideoDto) {
    return this.generationService.createVideoGeneration(req.user.sub, body);
  }

  @Get('providers')
  getProviders() {
    return this.generationService.getProviders();
  }

  @Get()
  list(
    @Req() req: any,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.generationService.listByUser(req.user.sub, {
      type,
      status,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.generationService.findById(id, req.user.sub);
  }
}
