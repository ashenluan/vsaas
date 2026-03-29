import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { GenerationModule } from './generation/generation.module';
import { ProviderModule } from './provider/provider.module';
import { QueueModule } from './queue/queue.module';
import { StorageModule } from './storage/storage.module';
import { WsModule } from './ws/ws.module';
import { HealthController } from './health.controller';
import { AdminModule } from './admin/admin.module';
import { DigitalHumanModule } from './digital-human/digital-human.module';
import { TemplateModule } from './template/template.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get('REDIS_PASSWORD', undefined),
        },
      }),
    }),
    PrismaModule,
    AuthModule,
    UserModule,
    GenerationModule,
    ProviderModule,
    QueueModule,
    StorageModule,
    WsModule,
    AdminModule,
    DigitalHumanModule,
    TemplateModule,
    AiModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
