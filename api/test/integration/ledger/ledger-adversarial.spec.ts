/// <reference types="jest" />
/* eslint-disable */

import { PostgresHarness } from '../../helpers/postgres.harness';

describe('PostgreSQL Ledger Adversarial Hardening', () => {
  let harness: PostgresHarness;

  const ASSET_ACCT = '11111111-1111-1111-1111-111111111111';
  const LIABILITY_ACCT = '22222222-2222-2222-2222-222222222222';
  const USD_ACCT = '99999999-9999-9999-9999-999999999999';

  // Valid SHA-256 hexadecimal strings for the new CHECK constraints
  const VALID_HASH_A = 'a'.repeat(64);
  const VALID_HASH_B = 'b'.repeat(64);
  const VALID_HASH_C = 'c'.repeat(64);

  beforeAll(async () => {
    harness = new PostgresHarness();
    await harness.start();
  }, 30000);

  afterAll(async () => {
    await harness.stop();
  });

  it('1. Idempotency: Reject reused keys with mismatched payload hashes', async () => {
    const query = `
      SELECT finance.post_ledger_transaction('PAYMENT', 'ORDER', 'ord-100', 'idemp-100', 'KES',
        ARRAY[
          ROW($1::UUID, 'DEBIT', 2000.00)::finance.ledger_entry_input,
          ROW($2::UUID, 'CREDIT', 2000.00)::finance.ledger_entry_input
        ]::finance.ledger_entry_input[],
        $3::CHAR(64)
      ) AS tx_id;
    `;

    // First successful transaction with hash A
    await harness.client.query(query, [
      ASSET_ACCT,
      LIABILITY_ACCT,
      VALID_HASH_A,
    ]);

    // Legitimate retry with identical hash passes silently
    await harness.client.query(query, [
      ASSET_ACCT,
      LIABILITY_ACCT,
      VALID_HASH_A,
    ]);

    // Malicious/buggy retry with same key but different hash aborts violently
    await expect(
      harness.client.query(query, [ASSET_ACCT, LIABILITY_ACCT, VALID_HASH_B]),
    ).rejects.toThrow(
      'IDEMPOTENCY_CONFLICT: Key reused with mismatched payload',
    );
  });

  it('2. Currency Isolation: Block KES transactions from touching USD accounts', async () => {
    const query = `
      SELECT finance.post_ledger_transaction('PAYMENT', 'ORDER', 'ord-101', 'idemp-101', 'KES',
        ARRAY[
          ROW($1::UUID, 'DEBIT', 2000.00)::finance.ledger_entry_input,
          ROW($2::UUID, 'CREDIT', 2000.00)::finance.ledger_entry_input -- USD Account!
        ]::finance.ledger_entry_input[]);
    `;

    await expect(
      harness.client.query(query, [ASSET_ACCT, USD_ACCT]),
    ).rejects.toThrow(
      'CURRENCY_MISMATCH: Cannot post KES transaction to USD account',
    );
  });

  it('3. Business Reference: Partial index prevents duplicate PAYMENTs for the same Order', async () => {
    const query = `
      SELECT finance.post_ledger_transaction('PAYMENT', 'ORDER', 'unique-order-1', $1::VARCHAR, 'KES',
        ARRAY[
          ROW($2::UUID, 'DEBIT', 500.00)::finance.ledger_entry_input,
          ROW($3::UUID, 'CREDIT', 500.00)::finance.ledger_entry_input
        ]::finance.ledger_entry_input[]);
    `;

    // First payment succeeds
    await harness.client.query(query, ['key-1', ASSET_ACCT, LIABILITY_ACCT]);

    // Second payment attempt for the same order (different idempotency key) blocked by partial index
    await expect(
      harness.client.query(query, ['key-2', ASSET_ACCT, LIABILITY_ACCT]),
    ).rejects.toThrow(
      'duplicate key value violates unique constraint "uq_ledger_single_payment"',
    );
  });

  it('4. Refund Boundary: Prevent concurrent or sequential over-refunding via FOR UPDATE lock', async () => {
    // 1. Setup a 2000 KES Payment
    const paymentRes: any = await harness.client.query(
      `
      SELECT finance.post_ledger_transaction('PAYMENT', 'ORDER', 'ord-102', 'pay-102', 'KES',
        ARRAY[
          ROW($1::UUID, 'DEBIT', 2000.00)::finance.ledger_entry_input,
          ROW($2::UUID, 'CREDIT', 2000.00)::finance.ledger_entry_input
        ]::finance.ledger_entry_input[]) AS tx_id;
    `,
      [ASSET_ACCT, LIABILITY_ACCT],
    );

    const parentId = paymentRes.rows[0].tx_id;

    // 2. Base refund query
    const refundQuery = `
      SELECT finance.post_ledger_transaction('REFUND', 'ORDER', 'ord-102', $1::VARCHAR, 'KES',
        ARRAY[
          ROW($2::UUID, 'DEBIT', 1500.00)::finance.ledger_entry_input,
          ROW($3::UUID, 'CREDIT', 1500.00)::finance.ledger_entry_input
        ]::finance.ledger_entry_input[],
        $5::CHAR(64), $4::UUID
      );
    `;

    // 3. First partial refund of 1500 KES succeeds
    await harness.client.query(refundQuery, [
      'ref-102-a',
      LIABILITY_ACCT,
      ASSET_ACCT,
      parentId,
      VALID_HASH_C,
    ]);

    // 4. Second partial refund of 1500 KES (Total 3000 > 2000) gets violently rejected
    await expect(
      harness.client.query(refundQuery, [
        'ref-102-b',
        LIABILITY_ACCT,
        ASSET_ACCT,
        parentId,
        VALID_HASH_C,
      ]),
    ).rejects.toThrow(
      'REFUND_EXCEEDED: Cannot refund more than original amount',
    );
  });

  it('5. Database Privileges: App layer cannot directly INSERT, UPDATE, or DELETE', async () => {
    // We use harness.appClient which connects as 'animanga_app' instead of the admin

    // Block direct INSERT (Providing a valid 64 char hex hash to ensure we fail on Permissions, not Format Validation)
    const validHexZeros = '0'.repeat(64);
    await expect(
      harness.appClient.query(
        `INSERT INTO finance.ledger_transactions (transaction_type, reference_type, reference_id, idempotency_key, request_hash) VALUES ('X', 'Y', 'Z', 'K', '${validHexZeros}')`,
      ),
    ).rejects.toThrow('permission denied for table ledger_transactions');

    // Block direct UPDATE
    await expect(
      harness.appClient.query(
        `UPDATE finance.ledger_entries SET amount = 1000`,
      ),
    ).rejects.toThrow('permission denied for table ledger_entries');

    // Block direct DELETE
    await expect(
      harness.appClient.query(`DELETE FROM finance.ledger_transactions`),
    ).rejects.toThrow('permission denied for table ledger_transactions');

    // Prove EXECUTE on the stored procedure IS permitted
    const validCall = harness.appClient.query(
      `
      SELECT finance.post_ledger_transaction('FEE', 'ORDER', 'ord-103', 'idemp-103', 'KES',
        ARRAY[
          ROW($1::UUID, 'DEBIT', 10.00)::finance.ledger_entry_input,
          ROW($2::UUID, 'CREDIT', 10.00)::finance.ledger_entry_input
        ]::finance.ledger_entry_input[]);
    `,
      [ASSET_ACCT, LIABILITY_ACCT],
    );

    await expect(validCall).resolves.toBeDefined();
  });
});
