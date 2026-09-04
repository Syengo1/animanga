/// <reference types="jest" />
/* eslint-disable */

import { PostgresHarness } from '../../helpers/postgres.harness';

describe('PostgreSQL Ledger Reversals & Refunds', () => {
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

  it('1. Successfully executes a full payment reversal', async () => {
    // 1. Original Payment (Customer buys a KSh 2000 ticket)
    const paymentQuery = `
      SELECT finance.post_ledger_transaction('PAYMENT', 'ORDER', 'order-001', 'idemp-pay-001', 'KES',
        ARRAY[
          ROW($1::UUID, 'DEBIT', 2000.00)::finance.ledger_entry_input,
          ROW($2::UUID, 'CREDIT', 1800.00)::finance.ledger_entry_input,
          ROW($3::UUID, 'CREDIT', 200.00)::finance.ledger_entry_input
        ]::finance.ledger_entry_input[]) AS tx_id;
    `;
    await harness.client.query(paymentQuery, [
      ASSET_ACCT,
      LIABILITY_ACCT,
      REVENUE_ACCT,
    ]);

    // 2. The Reversal (Inverting the exact entries)
    const reversalQuery = `
      SELECT finance.post_ledger_transaction('REFUND', 'ORDER', 'order-001', 'idemp-ref-001', 'KES',
        ARRAY[
          ROW($1::UUID, 'CREDIT', 2000.00)::finance.ledger_entry_input,
          ROW($2::UUID, 'DEBIT', 1800.00)::finance.ledger_entry_input,
          ROW($3::UUID, 'DEBIT', 200.00)::finance.ledger_entry_input
        ]::finance.ledger_entry_input[]) AS tx_id;
    `;
    await harness.client.query(reversalQuery, [
      ASSET_ACCT,
      LIABILITY_ACCT,
      REVENUE_ACCT,
    ]);

    // 3. Verify the final balances are mathematically exactly 0.00
    const balanceQuery = `
      SELECT 
        account_id,
        SUM(CASE WHEN direction='CREDIT' THEN amount ELSE -amount END) AS balance
      FROM finance.ledger_entries 
      GROUP BY account_id;
    `;
    const res: any = await harness.client.query(balanceQuery);

    res.rows.forEach((row: any) => {
      expect(Number(row.balance)).toBe(0);
    });
  });

  it('2. Enforces zero-sum math even during a partial refund', async () => {
    // Attempting to refund the KSh 2000 to the customer, but forgetting to claw back the KSh 200 platform fee
    const badPartialRefundQuery = `
      SELECT finance.post_ledger_transaction('REFUND', 'ORDER', 'order-002', 'idemp-ref-002', 'KES',
        ARRAY[
          ROW($1::UUID, 'CREDIT', 2000.00)::finance.ledger_entry_input,
          ROW($2::UUID, 'DEBIT', 1800.00)::finance.ledger_entry_input
          -- Missing the 200 DEBIT from Platform Revenue
        ]::finance.ledger_entry_input[]);
    `;

    await expect(
      harness.client.query(badPartialRefundQuery, [ASSET_ACCT, LIABILITY_ACCT]),
    ).rejects.toThrow(
      'Ledger imbalance: Debits (1800.0000) != Credits (2000.0000)',
    );
  });
});
