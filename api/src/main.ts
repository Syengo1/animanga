import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFileSync } from 'fs';
import { join } from 'path';

import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    exposedHeaders: ['x-request-id'],
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('Animanga Platform API')
    .setDescription(
      'Strictly defined contracts for Commerce, Events, and Identity',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    // FIX: Corrected OpenAPI 3 specification for API Keys
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

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Animanga Platform API running on port ${port} (api/v1)`);
  console.log(`📖 OpenAPI docs available at http://localhost:${port}/docs`);
}

bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
