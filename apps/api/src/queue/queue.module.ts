import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ImageGenerationProcessor } from './processors/image-generation.processor';
import { VideoGenerationProcessor } from './processors/video-generation.processor';
import { BatchProductionProcessor } from './processors/batch-production.processor';
import { VoiceCloningProcessor } from './processors/voice-cloning.processor';
import { DigitalHumanVideoProcessor } from './processors/digital-human-video.processor';
import { GenerationModule } from '../generation/generation.module';
import { ProviderModule } from '../provider/provider.module';
import { UserModule } from '../user/user.module';
import { StorageModule } from '../storage/storage.module';
import { WsModule } from '../ws/ws.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'image-generation' },
      { name: 'video-generation' },
      { name: 'voice-cloning' },
      { name: 'batch-production' },
      { name: 'digital-human-video' },
    ),
    GenerationModule,
    ProviderModule,
    UserModule,
    StorageModule,
    WsModule,
    PrismaModule,
  ],
  providers: [
    ImageGenerationProcessor,
    VideoGenerationProcessor,
    BatchProductionProcessor,
    VoiceCloningProcessor,
    DigitalHumanVideoProcessor,
  ],
  exports: [BullModule],
})
export class QueueModule {}
