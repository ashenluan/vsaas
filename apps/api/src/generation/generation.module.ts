import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { GenerationService } from './generation.service';
import { GenerationController } from './generation.controller';
import { GenerationPublicController } from './generation-public.controller';
import { ProviderModule } from '../provider/provider.module';
import { UserModule } from '../user/user.module';
import { PricingModule } from '../pricing/pricing.module';

@Module({
  imports: [
    ProviderModule,
    UserModule,
    PricingModule,
    BullModule.registerQueue(
      { name: 'image-generation' },
      { name: 'video-generation' },
      { name: 'storyboard-compose' },
    ),
  ],
  controllers: [GenerationController, GenerationPublicController],
  providers: [GenerationService],
  exports: [GenerationService],
})
export class GenerationModule {}
