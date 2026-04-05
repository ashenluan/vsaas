import './instrument';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // 启动时校验必需环境变量
  const requiredEnvVars = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'DATABASE_URL',
    'IMS_CALLBACK_TOKEN',
    'ALIYUN_ACCESS_KEY_ID',
    'ALIYUN_ACCESS_KEY_SECRET',
  ];
  const missing = requiredEnvVars.filter((v) => !config.get(v));
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }

  app.use(cookieParser());
  app.enableShutdownHooks();

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const appUrl = config.get<string>('APP_URL', 'http://localhost:3000');
  const adminUrl = config.get<string>('ADMIN_URL', 'http://localhost:3002');
  const corsOrigins = config.get<string>('CORS_ORIGIN', '');

  const origins = corsOrigins
    ? corsOrigins.split(',')
    : [
        appUrl,
        appUrl.replace('localhost', '127.0.0.1'),
        adminUrl,
        adminUrl.replace('localhost', '127.0.0.1'),
      ];

  app.enableCors({
    origin: origins,
    credentials: true,
  });

  app.setGlobalPrefix('api');

  const port = config.get<number>('PORT', 4000);
  await app.listen(port);
  new Logger('Bootstrap').log(`API running on http://localhost:${port}`);
}
bootstrap();
