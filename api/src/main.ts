import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFileSync } from 'fs';
import { join } from 'path';

import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Trust Proxy for Railway/Cloudflare load balancers (ensures accurate IP mapping for rate limits)
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.use(helmet());

  // Strict CORS Configuration filtered safely
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    'https://animanga.app',
    'https://www.animanga.app',
    'http://localhost:3000',
  ].filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl) or matched domains
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      // Allow dynamic Vercel preview environments if explicitly enabled
      if (
        process.env.ALLOW_VERCEL_PREVIEWS === 'true' &&
        origin.endsWith('.vercel.app')
      ) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`), false);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    exposedHeaders: ['x-request-id'],
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Enable Graceful Shutdown to allow active requests/connections to close safely
  app.enableShutdownHooks();

  const config = new DocumentBuilder()
    .setTitle('Animanga Platform API')
    .setDescription(
      'Strictly defined contracts for Commerce, Events, and Identity',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addApiKey(
      { type: 'apiKey', in: 'header', name: 'x-scanner-api-key' },
      'ScannerAuth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  if (process.env.NODE_ENV !== 'production') {
    writeFileSync(
      join(process.cwd(), 'openapi.json'),
      JSON.stringify(document, null, 2),
    );
  }

  // Robust port assignment. Railway injects PORT dynamically; fallback to 8080 if missing.
  const port = parseInt(process.env.PORT || '8080', 10);

  // Explicitly binding to 0.0.0.0 is mandatory for external traffic routing in Railway.
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Animanga Platform API running on port ${port} (api/v1)`);
  console.log(`📖 OpenAPI docs available at http://localhost:${port}/docs`);
}

bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
