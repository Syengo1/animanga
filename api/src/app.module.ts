// C:\Projects\animanga-platform\api\src\app.module.ts
import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
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
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => {
        return configService.getOrThrow<TypeOrmModuleOptions>('database');
      },
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        if (redisUrl) {
          const url = new URL(redisUrl);
          const isTls = url.protocol === 'rediss:';
          return {
            connection: {
              host: url.hostname,
              port: Number(url.port) || 6379,
              username: decodeURIComponent(url.username) || undefined,
              password: decodeURIComponent(url.password) || undefined,
              tls: isTls ? { rejectUnauthorized: false } : undefined,
              maxRetriesPerRequest: null,
              enableReadyCheck: false,
            },
          };
        }
        return {
          connection: {
            host: configService.get<string>('REDIS_HOST', 'localhost'),
            port: configService.get<number>('REDIS_PORT', 6379),
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
          },
        };
      },
    }),
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
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Express v5 / path-to-regexp v8 named wildcard syntax
    consumer.apply(RequestIdMiddleware, LoggerMiddleware).forRoutes('{*path}');
  }
}
