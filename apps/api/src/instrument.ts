import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/nestjs';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    profilesSampleRate: 0.1,
    integrations: [nodeProfilingIntegration()],
    // 忽略常见的非异常错误
    ignoreErrors: [
      'Insufficient credits',
      'User not found',
      'Unauthorized',
      'ThrottlerException',
    ],
  });
}
