// C:\Projects\animanga-platform\api\src\config\data-source.ts
import { DataSource } from 'typeorm';

const databaseUrl = process.env.DATABASE_URL;
const useSsl =
  process.env.DB_SSL === 'true' ||
  process.env.NODE_ENV === 'production' ||
  Boolean(databaseUrl && !databaseUrl.includes('localhost'));

export default new DataSource({
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
  ssl: useSsl ? { rejectUnauthorized: false } : false,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  synchronize: false,
  extra: {
    max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    idleTimeoutMillis: 20000,
    connectionTimeoutMillis: 10000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  },
});
