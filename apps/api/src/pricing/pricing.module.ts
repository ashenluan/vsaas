import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProviderModule } from '../provider/provider.module';
import { PricingService } from './pricing.service';

@Module({
  imports: [PrismaModule, ProviderModule],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
