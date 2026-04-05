import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import IORedis from 'ioredis';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  private readonly redisConfig: { host: string; port: number; password?: string };

  constructor(private readonly config: ConfigService) {
    super();
    this.redisConfig = {
      host: this.config.get('REDIS_HOST', 'localhost'),
      port: this.config.get<number>('REDIS_PORT', 6379),
      password: this.config.get('REDIS_PASSWORD', undefined),
    };
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    let client: IORedis | undefined;
    try {
      client = new IORedis({
        ...this.redisConfig,
        connectTimeout: 3000,
        lazyConnect: true,
      });
      await client.connect();
      const pong = await client.ping();
      await client.quit();
      if (pong === 'PONG') {
        return this.getStatus(key, true);
      }
      throw new Error('Unexpected ping response');
    } catch (error) {
      if (client) await client.quit().catch(() => {});
      throw new HealthCheckError('Redis check failed', this.getStatus(key, false));
    }
  }
}
