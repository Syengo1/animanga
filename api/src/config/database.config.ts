// C:\Projects\animanga-platform\api\src\config\database.config.ts
import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export default registerAs('database', (): TypeOrmModuleOptions => {
  const isProd = process.env.NODE_ENV === 'production';
  const databaseUrl = process.env.DATABASE_URL;
  const useSsl =
    process.env.DB_SSL === 'true' ||
    isProd ||
    Boolean(databaseUrl && !databaseUrl.includes('localhost'));

  return {
    type: 'postgres',
    ...(databaseUrl
      ? { url: databaseUrl }
      : {
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5433', 10),
          username: process.env.DB_USER || 'animanga_admin',
          password: process.env.DB_PASSWORD || '',
          database: process.env.DB_NAME || 'animanga_ledger',
        }),
    autoLoadEntities: true,
    // CRITICAL SECURITY FIX: Never run synchronize: true in production
    synchronize: process.env.DB_SYNCHRONIZE === 'true' && !isProd,
    migrationsRun: false,
    logging: isProd ? ['error'] : ['warn', 'error'],
    maxQueryExecutionTime: 2000,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
    extra: {
      max: parseInt(process.env.DB_POOL_MAX || '10', 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    },
  };
});
