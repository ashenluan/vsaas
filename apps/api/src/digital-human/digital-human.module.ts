import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { UserModule } from '../user/user.module';
import { ProviderModule } from '../provider/provider.module';
import { StorageModule } from '../storage/storage.module';
import { WsModule } from '../ws/ws.module';
import { DigitalHumanService } from './digital-human.service';
import { DigitalHumanController } from './digital-human.controller';
import { VoiceController } from './voice.controller';
import { MaterialController } from './material.controller';
import { ScriptController } from './script.controller';
import { MixcutController } from './mixcut.controller';
import { CallbackController } from './callback.controller';
import { DhBatchV2Controller } from './dh-batch-v2.controller';

@Module({
  imports: [
    PrismaModule,
    UserModule,
    ProviderModule,
    StorageModule,
    WsModule,
    BullModule.registerQueue(
      { name: 'voice-cloning' },
      { name: 'digital-human-video' },
      { name: 'mixcut-production' },
      { name: 'dh-batch-v2' },
    ),
  ],
  controllers: [
    DigitalHumanController,
    VoiceController,
    MaterialController,
    ScriptController,
    MixcutController,
    CallbackController,
    DhBatchV2Controller,
  ],
  providers: [DigitalHumanService],
  exports: [DigitalHumanService],
})
export class DigitalHumanModule {}
