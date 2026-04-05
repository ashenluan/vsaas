import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ImageGenerationProcessor } from './processors/image-generation.processor';
import { VideoGenerationProcessor } from './processors/video-generation.processor';
import { VoiceCloningProcessor } from './processors/voice-cloning.processor';
import { DigitalHumanVideoProcessor } from './processors/digital-human-video.processor';
import { MixcutProductionProcessor } from './processors/mixcut-production.processor';
import { DhBatchV2Processor } from './processors/dh-batch-v2.processor';
import { StoryboardComposeProcessor } from './processors/storyboard-compose.processor';
import { GenerationModule } from '../generation/generation.module';
import { ProviderModule } from '../provider/provider.module';
import { UserModule } from '../user/user.module';
import { StorageModule } from '../storage/storage.module';
import { WsModule } from '../ws/ws.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'image-generation', defaultJobOptions: { attempts: 2, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 100, removeOnFail: 500 } },
      { name: 'video-generation', defaultJobOptions: { attempts: 2, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 100, removeOnFail: 500 } },
      { name: 'voice-cloning', defaultJobOptions: { attempts: 2, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 100, removeOnFail: 500 } },
      { name: 'digital-human-video', defaultJobOptions: { attempts: 2, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 100, removeOnFail: 500 } },
      { name: 'mixcut-production', defaultJobOptions: { attempts: 1, removeOnComplete: 50, removeOnFail: 200 } },
      { name: 'dh-batch-v2', defaultJobOptions: { attempts: 1, removeOnComplete: 50, removeOnFail: 200 } },
      { name: 'storyboard-compose', defaultJobOptions: { attempts: 2, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 100, removeOnFail: 500 } },
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
    VoiceCloningProcessor,
    DigitalHumanVideoProcessor,
    MixcutProductionProcessor,
    DhBatchV2Processor,
    StoryboardComposeProcessor,
  ],
  exports: [BullModule],
})
export class QueueModule {}
