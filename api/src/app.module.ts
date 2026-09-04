import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule } from '@nestjs/throttler';

import databaseConfig from './config/database.config';
import { FinanceModule } from './modules/finance/finance.module';
import { IntegrationModule } from './modules/integration/integration.module';
import { PaymentWorkerModule } from './modules/integration/workers/payment-worker.module';
import { CommerceModule } from './modules/commerce/commerce.module';
import { IdentityModule } from './modules/identity/identity.module';
import { EventsModule } from './modules/events/events.module';
import { SystemModule } from './modules/system/system.module';

import { RequestIdMiddleware } from './common/middleware/request-id.middleware'; // <-- Added
import { LoggerMiddleware } from './common/middleware/logger.middleware';

import { ContentModule } from './modules/content/content.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        configService.get<TypeOrmModuleOptions>('database'),
    }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
      },
    }),
    // Global Rate Limiting: max 100 requests per IP every 60 seconds
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    SystemModule,
    FinanceModule,
    IntegrationModule,
    PaymentWorkerModule,
    IdentityModule,
    CommerceModule,
    EventsModule,
    ContentModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply request ID tagging FIRST, then the logger
    consumer.apply(RequestIdMiddleware, LoggerMiddleware).forRoutes('*');
  }
}
