import './instrument';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { buildAllowedOrigins } from './config/allowed-origins';
import { resolveGoogleImagenKey, resolveLlmApiKey } from './config/env-resolver';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const bootstrapLogger = new Logger('Bootstrap');

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

  const optionalFeatures = [
    {
      enabled: !!resolveLlmApiKey({
        LLM_API_KEY: config.get<string>('LLM_API_KEY'),
        DASHSCOPE_API_KEY: config.get<string>('DASHSCOPE_API_KEY'),
      }),
      enabledMessage: 'AI assistant features enabled',
      disabledMessage: 'AI assistant features disabled (set LLM_API_KEY or DASHSCOPE_API_KEY)',
    },
    {
      enabled: !!config.get<string>('GROK_API_KEY'),
      enabledMessage: 'Grok providers enabled',
      disabledMessage: 'Grok providers disabled (missing GROK_API_KEY)',
    },
    {
      enabled: !!config.get<string>('OPENAI_API_KEY'),
      enabledMessage: 'OpenAI Sora provider enabled',
      disabledMessage: 'OpenAI Sora provider disabled (missing OPENAI_API_KEY)',
    },
    {
      enabled: !!config.get<string>('VOLCENGINE_API_KEY'),
      enabledMessage: 'Jimeng / Seedance providers enabled',
      disabledMessage: 'Jimeng / Seedance providers disabled (missing VOLCENGINE_API_KEY)',
    },
    {
      enabled: !!resolveGoogleImagenKey({
        GOOGLE_IMAGEN_API_KEY: config.get<string>('GOOGLE_IMAGEN_API_KEY'),
        GOOGLE_API_KEY: config.get<string>('GOOGLE_API_KEY'),
      }),
      enabledMessage: 'Google Imagen enabled',
      disabledMessage: 'Google Imagen disabled (set GOOGLE_IMAGEN_API_KEY or GOOGLE_API_KEY)',
    },
    {
      enabled: !!config.get<string>('GOOGLE_API_KEY'),
      enabledMessage: 'Google Veo enabled',
      disabledMessage: 'Google Veo disabled (missing GOOGLE_API_KEY)',
    },
  ];

  for (const feature of optionalFeatures) {
    if (feature.enabled) {
      bootstrapLogger.log(feature.enabledMessage);
      continue;
    }

    bootstrapLogger.warn(feature.disabledMessage);
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

  const origins = buildAllowedOrigins(appUrl, adminUrl, corsOrigins);

  app.enableCors({
    origin: origins,
    credentials: true,
  });

  app.setGlobalPrefix('api');

  const port = config.get<number>('PORT', 4000);
  await app.listen(port);
  bootstrapLogger.log(`API running on http://localhost:${port}`);
}
bootstrap();
