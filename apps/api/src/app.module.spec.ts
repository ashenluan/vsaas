import { describe, it, expect } from 'vitest';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * 验证 ThrottlerModule 配置的结构性测试
 * 确保限流模块正确导入和配置
 */
describe('Rate Limiting 配置', () => {
  it('ThrottlerModule 可正常导入', () => {
    expect(ThrottlerModule).toBeDefined();
    expect(ThrottlerGuard).toBeDefined();
    expect(APP_GUARD).toBe('APP_GUARD');
  });

  it('ThrottlerModule.forRoot 接受多级限流配置', () => {
    const config = ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 5 },
      { name: 'medium', ttl: 60000, limit: 60 },
      { name: 'long', ttl: 3600000, limit: 500 },
    ]);

    expect(config).toBeDefined();
    expect(config.module).toBe(ThrottlerModule);
  });
});
