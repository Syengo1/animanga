import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

export class PostgresHarness {
  private container!: StartedPostgreSqlContainer;
  public client!: Pool;
  public appClient!: Pool; // Restricted application client

  async start(): Promise<void> {
    this.container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('animanga_test')
      .withUsername('test_admin')
      .withPassword('test_password')
      .withCommand(['-c', 'max_connections=300']) // <-- Add this line!
      .start();

    // 1. The highly privileged admin client (used for migrations/setup)
    this.client = new Pool({
      connectionString: this.container.getConnectionUri(),
      max: 100, // Our pool will open 100 connections, leaving 200 for the DB's background tasks
    });

    await this.applySchema();

    // 2. The restricted application client
    this.appClient = new Pool({
      host: this.container.getHost(),
      port: this.container.getPort(),
      database: 'animanga_test',
      user: 'animanga_app',
      password: 'app_password',
      max: 50,
    });
  }

  async stop(): Promise<void> {
    if (this.appClient) await this.appClient.end();
    if (this.client) await this.client.end();
    if (this.container) await this.container.stop();
  }

  private async applySchema(): Promise<void> {
    // 1. Execute the actual Draft 06 production schema
    const schemaPath06 = path.join(
      __dirname,
      '../../src/database/migrations/0006_final_domain_schema.sql',
    );
    const draft06Schema = fs.readFileSync(schemaPath06, 'utf8');
    await this.client.query(draft06Schema);

    // 2. Execute the Draft 07 production schema (Splitting Mutable Processing State)
    const schemaPath07 = path.join(
      __dirname,
      '../../src/database/migrations/0007_event_processing_split.sql',
    );
    if (fs.existsSync(schemaPath07)) {
      const draft07Schema = fs.readFileSync(schemaPath07, 'utf8');
      await this.client.query(draft07Schema);
    }

    // 3. Inject test-specific seeds and application roles (These don't belong in prod migrations)
    const testSetup = `
        -- Create the restricted application role for privilege testing
        DO $$ 
        BEGIN
            IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'animanga_app') THEN
                CREATE ROLE animanga_app WITH LOGIN PASSWORD 'app_password';
            END IF;
        END
        $$;
        
        -- Grant permissions on schemas the application is allowed to modify
        GRANT USAGE ON SCHEMA identity, commerce, events, integration, finance TO animanga_app;
        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA identity TO animanga_app;
        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA commerce TO animanga_app;
        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA events TO animanga_app;
        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA integration TO animanga_app;
        
        -- Specifically grant EXECUTE for the Ledger
        GRANT EXECUTE ON FUNCTION finance.post_ledger_transaction TO animanga_app;

        -- Seed the test accounts (including the USD account for isolation testing)
        INSERT INTO finance.accounts (id, classification, account_code, account_type, currency) VALUES 
        ('11111111-1111-1111-1111-111111111111', 'ASSET', 'asset:clearing:mpesa', 'CLEARING', 'KES'),
        ('22222222-2222-2222-2222-222222222222', 'LIABILITY', 'liability:merchants:payables', 'PAYABLE', 'KES'),
        ('33333333-3333-3333-3333-333333333333', 'REVENUE', 'revenue:platform:fees', 'FEES', 'KES'),
        ('99999999-9999-9999-9999-999999999999', 'ASSET', 'asset:clearing:stripe', 'CLEARING', 'USD')
        ON CONFLICT (account_code, currency) DO NOTHING;
      `;
    await this.client.query(testSetup);
  }
}
