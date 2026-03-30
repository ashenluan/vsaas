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
import { ComposeController } from './compose.controller';
import { MixcutController } from './mixcut.controller';
import { CallbackController } from './callback.controller';

@Module({
  imports: [
    PrismaModule,
    UserModule,
    ProviderModule,
    StorageModule,
    WsModule,
    BullModule.registerQueue(
      { name: 'voice-cloning' },
      { name: 'batch-production' },
      { name: 'digital-human-video' },
      { name: 'mixcut-production' },
    ),
  ],
  controllers: [
    DigitalHumanController,
    VoiceController,
    MaterialController,
    ScriptController,
    ComposeController,
    MixcutController,
    CallbackController,
  ],
  providers: [DigitalHumanService],
  exports: [DigitalHumanService],
})
export class DigitalHumanModule {}
