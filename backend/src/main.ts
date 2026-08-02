import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import * as fs from 'fs';
import helmet from 'helmet';
import { sanitizeInput } from './common/utils/sanitizer.util';

(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

async function bootstrap() {
  if (!process.env.DATABASE_URL) {
    console.error('FATAL: DATABASE_URL environment variable is missing.');
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Security Headers (Allow cross-origin static resource loading for uploads)
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Global XSS Sanitization Middleware
  app.use((req: any, res: any, next: any) => {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeInput(req.body);
    }
    next();
  });

  const envOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];
  const defaultOrigins = ['http://localhost:3000', 'https://test.zinichat.com', 'https://zinichat.com', 'https://www.zinichat.com'];

  app.enableCors({
    origin: [...envOrigins, ...defaultOrigins],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // ─── Global Validation Pipe ──────────────────────────────────────────────────
  // Strips unknown properties and enforces class-validator rules
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,           // Strip properties not in DTO
    forbidNonWhitelisted: true, // Throw error if extra properties are sent
    transform: true,           // Auto-transform payloads to DTO types
  }));

  // ─── Uploads ─────────────────────────────────────────────────────────────────
  const uploadsDir = join(__dirname, '..', 'uploads', 'avatars');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Serve uploaded files statically
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
