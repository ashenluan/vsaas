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
import { Throttle } from '@nestjs/throttler';
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
  @Throttle({ short: { ttl: 10000, limit: 3 }, medium: { ttl: 60000, limit: 20 } })
  createImage(@Req() req: any, @Body() body: any) {
    // Route to advanced generation if body has an advanced type
    const advancedTypes = Object.values(AdvancedImageType) as string[];
    if (body.type && advancedTypes.includes(body.type)) {
      return this.generationService.createAdvancedImageGeneration(req.user.sub, body);
    }
    return this.generationService.createImageGeneration(req.user.sub, body);
  }

  @Post('video')
  @Throttle({ short: { ttl: 10000, limit: 2 }, medium: { ttl: 60000, limit: 10 } })
  createVideo(@Req() req: any, @Body() body: CreateVideoDto) {
    return this.generationService.createVideoGeneration(req.user.sub, body);
  }

  @Post('storyboard/compose')
  @Throttle({ short: { ttl: 10000, limit: 2 }, medium: { ttl: 60000, limit: 5 } })
  createStoryboardCompose(@Req() req: any, @Body() body: any) {
    return this.generationService.createStoryboardCompose(req.user.sub, body);
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
    @Query('provider') provider?: string,
  ) {
    return this.generationService.listByUser(req.user.sub, {
      type,
      status,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      provider,
    });
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.generationService.findById(id, req.user.sub);
  }
}
