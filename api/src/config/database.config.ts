import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export default registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433', 10),
    username: process.env.DB_USER || 'animanga_admin',
    password: process.env.DB_PASSWORD || 'secure_password_here',
    database: process.env.DB_NAME || 'animanga_ledger',
    autoLoadEntities: true,
    synchronize: false,
    logging: ['warn', 'error'],
    maxQueryExecutionTime: 1000,
  }),
);
