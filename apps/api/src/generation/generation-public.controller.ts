import { Controller, Get } from '@nestjs/common';
import { GenerationService } from './generation.service';

@Controller('catalog')
export class GenerationPublicController {
  constructor(private readonly generationService: GenerationService) {}

  @Get('generation-pricing')
  getPricingCatalog() {
    return this.generationService.getPricingCatalog();
  }
}
