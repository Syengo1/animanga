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

import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { LoggerMiddleware } from './common/middleware/logger.middleware';

import { ContentModule } from './modules/content/content.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),
    // 1. Updated TypeORM to dynamically accept Railway's DATABASE_URL
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      // 1. Add the explicit return type to the arrow function
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => {
        const baseConfig =
          configService.get<TypeOrmModuleOptions>('database') || {};
        const databaseUrl = configService.get<string>('DATABASE_URL');

        if (databaseUrl) {
          return {
            ...baseConfig,
            type: 'postgres',
            url: databaseUrl,
          } as TypeOrmModuleOptions; // 2. Add this type assertion to bypass the union type mismatch
        }

        return baseConfig;
      },
    }),
    // 2. Updated BullMQ to parse Railway's REDIS_URL
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');

        // BullMQ expects a structured connection object. We use standard URL parsing to split Railway's raw string.
        if (redisUrl) {
          const url = new URL(redisUrl);
          return {
            connection: {
              host: url.hostname,
              port: Number(url.port),
              username: url.username || undefined,
              password: url.password || undefined,
            },
          };
        }

        // Fallback for local development
        return {
          connection: {
            host: configService.get<string>('REDIS_HOST', 'localhost'),
            port: configService.get<number>('REDIS_PORT', 6379),
          },
        };
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
