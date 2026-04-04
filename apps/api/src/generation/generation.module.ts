import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { GenerationService } from './generation.service';
import { GenerationController } from './generation.controller';
import { ProviderModule } from '../provider/provider.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    ProviderModule,
    UserModule,
    BullModule.registerQueue(
      { name: 'image-generation' },
      { name: 'video-generation' },
      { name: 'storyboard-compose' },
    ),
  ],
  controllers: [GenerationController],
  providers: [GenerationService],
  exports: [GenerationService],
})
export class GenerationModule {}
