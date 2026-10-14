import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { setupApp } from './setup-app';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  setupApp(app);

  // The frontend proxies /api/* to this server, so the browser only ever talks
  // to its own origin. CORS stays enabled for direct calls during development.
  app.set('trust proxy', 'loopback');
  app.enableCors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:3000', credentials: true });

  await app.listen(process.env.PORT ?? 4000);
}

void bootstrap();
