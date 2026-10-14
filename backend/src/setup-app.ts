import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';

/** Shared by main.ts and the e2e tests so both run the exact same pipeline. */
export function setupApp(app: INestApplication): void {
  app.use(cookieParser());
  // Every response is per-user data: browsers and proxies must never cache it.
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
}
