import { Controller, Get } from '@nestjs/common';
import { GenerationService } from './generation.service';

@Controller('generations')
export class GenerationPublicController {
  constructor(private readonly generationService: GenerationService) {}

  @Get('pricing')
  getPricingCatalog() {
    return this.generationService.getPricingCatalog();
  }
}
