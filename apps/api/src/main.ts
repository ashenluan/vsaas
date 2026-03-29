import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

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
  console.log(`API running on http://localhost:${port}`);
}
bootstrap();
