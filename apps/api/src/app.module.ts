import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { GenerationModule } from './generation/generation.module';
import { ProviderModule } from './provider/provider.module';
import { QueueModule } from './queue/queue.module';
import { StorageModule } from './storage/storage.module';
import { WsModule } from './ws/ws.module';
import { HealthModule } from './health/health.module';
import { AdminModule } from './admin/admin.module';
import { DigitalHumanModule } from './digital-human/digital-human.module';
import { TemplateModule } from './template/template.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{
      name: 'short',
      ttl: 1000,   // 1 second
      limit: 5,    // 5 requests per second
    }, {
      name: 'medium',
      ttl: 60000,  // 1 minute
      limit: 60,   // 60 requests per minute
    }, {
      name: 'long',
      ttl: 3600000, // 1 hour
      limit: 500,   // 500 requests per hour
    }]),
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
    HealthModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
