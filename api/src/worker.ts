import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  // Initializes the application context without starting the HTTP listener
  const app = await NestFactory.createApplicationContext(AppModule);

  // Enable graceful shutdown so active BullMQ jobs can finish or pause safely
  app.enableShutdownHooks();

  console.log('⚙️ Animanga Background Worker successfully started.');
}

bootstrap();
