/// <reference types="jest" />
/* eslint-disable */

import { PostgresHarness } from '../../helpers/postgres.harness';

describe('PostgreSQL Ledger Isolation & Atomicity', () => {
  let harness: PostgresHarness;

  const ASSET_ACCT = '11111111-1111-1111-1111-111111111111';
  const LIABILITY_ACCT = '22222222-2222-2222-2222-222222222222';
  const REVENUE_ACCT = '33333333-3333-3333-3333-333333333333';

  beforeAll(async () => {
    harness = new PostgresHarness();
    await harness.start();
  }, 30000);

  afterAll(async () => {
    await harness.stop();
  });

  it('1. Enforces CHECK constraint: Amounts must be strictly positive', async () => {
    const query = `
      SELECT finance.post_ledger_transaction('TEST', 'ORDER', 'ord-neg-1', 'idemp-neg-1', 'KES',
        ARRAY[
          ROW($1::UUID, 'DEBIT', 1000.00)::finance.ledger_entry_input,
          ROW($2::UUID, 'CREDIT', 900.00)::finance.ledger_entry_input,
          ROW($3::UUID, 'DEBIT', -100.00)::finance.ledger_entry_input -- Attempting a negative hack
        ]::finance.ledger_entry_input[]);
    `;

    await expect(
      harness.client.query(query, [ASSET_ACCT, LIABILITY_ACCT, REVENUE_ACCT]),
    ).rejects.toThrow(
      'violates check constraint "ledger_entries_amount_check"',
    );
  });

  it('2. Guarantees Atomic Rollback: A failed entry leaves absolutely zero trace', async () => {
    // Because the negative amount constraint will fail, we must ensure the transaction header
    // and the first two valid entries were also rolled back and destroyed.
    const txCount: any = await harness.client.query(
      `SELECT count(*) FROM finance.ledger_transactions WHERE idempotency_key = 'idemp-neg-1'`,
    );
    const entryCount: any = await harness.client.query(
      `SELECT count(*) FROM finance.ledger_entries`,
    );

    expect(Number(txCount.rows[0].count)).toBe(0);
    // Ensure no orphaned entries exist in the entire table
    expect(Number(entryCount.rows[0].count)).toBe(0);
  });

  it('3. Maintains isolation across concurrent INDEPENDENT transactions', async () => {
    // We will fire 50 completely distinct transactions at the same time.
    // We expect exactly 50 headers and 100 entries to be created, with zero cross-talk.
    const promises = Array(50)
      .fill(0)
      .map((_, i) => {
        const query = `
        SELECT finance.post_ledger_transaction('ISO_TEST', 'ORDER', 'ord-iso-${i}', 'idemp-iso-${i}', 'KES',
          ARRAY[
            ROW($1::UUID, 'DEBIT', 500.00)::finance.ledger_entry_input,
            ROW($2::UUID, 'CREDIT', 500.00)::finance.ledger_entry_input
          ]::finance.ledger_entry_input[]) AS tx_id;
      `;
        return harness.client.query(query, [ASSET_ACCT, LIABILITY_ACCT]);
      });

    const results: any[] = await Promise.all(promises);

    // Extract all 50 unique UUIDs
    const uniqueTxIds = new Set(results.map((r) => r.rows[0].tx_id));
    expect(uniqueTxIds.size).toBe(50);

    // Verify exactly 50 headers and 100 entries were written globally
    const txCount: any = await harness.client.query(
      `SELECT count(*) FROM finance.ledger_transactions WHERE transaction_type = 'ISO_TEST'`,
    );
    const entryCount: any = await harness.client.query(`
      SELECT count(*) FROM finance.ledger_entries e 
      JOIN finance.ledger_transactions t ON e.transaction_id = t.id 
      WHERE t.transaction_type = 'ISO_TEST'
    `);

    expect(Number(txCount.rows[0].count)).toBe(50);
    expect(Number(entryCount.rows[0].count)).toBe(100);
  });
});
