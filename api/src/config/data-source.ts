import { DataSource } from 'typeorm';

export default new DataSource({
  type: 'postgres',
  // Prioritize Railway's injected URL for production
  url: process.env.DATABASE_URL,

  // Fallbacks using your exact development variables from database.config.ts
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433', 10),
  username: process.env.DB_USER || 'animanga_admin',
  password: process.env.DB_PASSWORD || 'secure_password_here',
  database: process.env.DB_NAME || 'animanga_ledger',

  // Safely locate entities and migrations
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  synchronize: false,
});
