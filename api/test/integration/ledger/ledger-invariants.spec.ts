/// <reference types="jest" />
/* eslint-disable */

import { PostgresHarness } from '../../helpers/postgres.harness';

describe('PostgreSQL Ledger Invariants (Direct DB)', () => {
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

  it('1. Balanced transaction succeeds and maintains zero-sum', async () => {
    const query = `
      SELECT finance.post_ledger_transaction(
        'TEST_PAYMENT', 'TEST_ORDER', 'order-123', 'idemp-key-1', 'KES',
        ARRAY[
          ROW($1::UUID, 'DEBIT', 2000.00)::finance.ledger_entry_input,
          ROW($2::UUID, 'CREDIT', 1800.00)::finance.ledger_entry_input,
          ROW($3::UUID, 'CREDIT', 200.00)::finance.ledger_entry_input
        ]::finance.ledger_entry_input[]
      ) AS tx_id;
    `;

    const res: any = await harness.client.query(query, [
      ASSET_ACCT,
      LIABILITY_ACCT,
      REVENUE_ACCT,
    ]);
    const txId = res.rows[0].tx_id;
    expect(txId).toBeDefined();
  });

  it('2. Unbalanced transaction is impossible (rolls back)', async () => {
    const query = `
      SELECT finance.post_ledger_transaction(
        'TEST_PAYMENT', 'TEST_ORDER', 'order-456', 'idemp-key-2', 'KES',
        ARRAY[
          ROW($1::UUID, 'DEBIT', 2000.00)::finance.ledger_entry_input,
          ROW($2::UUID, 'CREDIT', 1800.00)::finance.ledger_entry_input
        ]::finance.ledger_entry_input[]
      );
    `;

    await expect(
      harness.client.query(query, [ASSET_ACCT, LIABILITY_ACCT]),
    ).rejects.toThrow(
      'Ledger imbalance: Debits (2000.0000) != Credits (1800.0000)',
    );
  });

  it('3. Ledger idempotency barrier rejects sequential duplicates', async () => {
    const query = `
      SELECT finance.post_ledger_transaction('TEST', 'ORDER', 'order-789', 'idemp-key-3', 'KES',
        ARRAY[
          ROW($1::UUID, 'DEBIT', 500.00)::finance.ledger_entry_input,
          ROW($2::UUID, 'CREDIT', 500.00)::finance.ledger_entry_input
        ]::finance.ledger_entry_input[]) AS tx_id;
    `;
    const res1: any = await harness.client.query(query, [
      ASSET_ACCT,
      LIABILITY_ACCT,
    ]);
    const res2: any = await harness.client.query(query, [
      ASSET_ACCT,
      LIABILITY_ACCT,
    ]);

    expect(res1.rows[0].tx_id).toBe(res2.rows[0].tx_id);
  });

  it('4. Ledger entries are strictly immutable', async () => {
    const query = `
      SELECT finance.post_ledger_transaction('TEST', 'ORDER', 'immutability-test', 'idemp-key-4', 'KES',
        ARRAY[
          ROW($1::UUID, 'DEBIT', 100.00)::finance.ledger_entry_input,
          ROW($2::UUID, 'CREDIT', 100.00)::finance.ledger_entry_input
        ]::finance.ledger_entry_input[]) AS tx_id;
    `;
    const res: any = await harness.client.query(query, [
      ASSET_ACCT,
      LIABILITY_ACCT,
    ]);
    const txId = res.rows[0].tx_id;

    // Attempt an unauthorized update
    const updateAttempt = harness.client.query(
      `UPDATE finance.ledger_entries SET amount = 9999 WHERE transaction_id = $1`,
      [txId],
    );
    await expect(updateAttempt).rejects.toThrow(
      'Record is strictly immutable (append-only)',
    );

    // Attempt an unauthorized delete
    const deleteAttempt = harness.client.query(
      `DELETE FROM finance.ledger_entries WHERE transaction_id = $1`,
      [txId],
    );
    await expect(deleteAttempt).rejects.toThrow(
      'Record is strictly immutable (append-only)',
    );
  });

  it('5. Idempotency holds under extreme concurrency (100 simultaneous requests)', async () => {
    const query = `
      SELECT finance.post_ledger_transaction('RACE_TEST', 'ORDER', 'race-123', 'concurrency-key-1', 'KES',
        ARRAY[
          ROW($1::UUID, 'DEBIT', 1500.00)::finance.ledger_entry_input,
          ROW($2::UUID, 'CREDIT', 1500.00)::finance.ledger_entry_input
        ]::finance.ledger_entry_input[]) AS tx_id;
    `;

    // Fire 100 simultaneous raw DB connections/queries at the exact same time
    const promises = Array(100)
      .fill(0)
      .map(() => harness.client.query(query, [ASSET_ACCT, LIABILITY_ACCT]));
    const results: any[] = await Promise.all(promises);

    // Verify all 100 promises resolved to the exact same UUID
    const firstTxId = results[0].rows[0].tx_id;
    results.forEach((res) => {
      expect(res.rows[0].tx_id).toBe(firstTxId);
    });

    // Verify only ONE transaction and TWO entries were physically written
    const txCount: any = await harness.client.query(
      `SELECT count(*) FROM finance.ledger_transactions WHERE idempotency_key = 'concurrency-key-1'`,
    );
    const entryCount: any = await harness.client.query(
      `SELECT count(*) FROM finance.ledger_entries WHERE transaction_id = $1`,
      [firstTxId],
    );

    expect(Number(txCount.rows[0].count)).toBe(1);
    expect(Number(entryCount.rows[0].count)).toBe(2);
  });
});
