import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const dbUrl = process.env.DATABASE_URL || '';
    // Append connection pool params if not already present
    const separator = dbUrl.includes('?') ? '&' : '?';
    const pooledUrl = dbUrl.includes('connection_limit')
      ? dbUrl
      : `${dbUrl}${separator}connection_limit=10&pool_timeout=30`;

    super({
      datasources: {
        db: {
          url: pooledUrl,
        },
      },
      log: process.env.NODE_ENV === 'production'
        ? ['error', 'warn']
        : ['query', 'error', 'warn'],
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }
}
