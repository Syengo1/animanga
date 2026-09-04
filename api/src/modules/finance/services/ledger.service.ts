import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import * as crypto from 'crypto';
import Decimal from 'decimal.js';

import { LedgerPostingError } from '../exceptions/ledger.exceptions';

export interface LedgerEntryInput {
  account_id: string;
  direction: 'DEBIT' | 'CREDIT';
  amount: string;
}

export interface CustomerPaymentLedgerParams {
  manager: EntityManager;
  paymentId: string;
  merchantId: string;
  amount: string;
  currency: string;
  providerTransactionId: string;
}

@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);
  private readonly COMMISSION_RATE = new Decimal('0.08'); // 8% platform fee

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private generateRequestHash(
    txType: string,
    refId: string,
    entries: LedgerEntryInput[],
  ): string {
    const payload = JSON.stringify({ txType, refId, entries });
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  async postCustomerPayment(
    params: CustomerPaymentLedgerParams,
  ): Promise<string> {
    const { manager, paymentId, merchantId, amount, currency } = params;

    // 1. Resolve Accounts
    const clearingAccountId = await this.getAccountIdByCode(
      'ASSET_MPESA_CLEARING',
    );
    const commissionAccountId = await this.getAccountIdByCode(
      'REVENUE_TICKET_COMMISSION',
    );

    // Dynamic merchant liability account lookup based on the strict schema
    const merchantAccountId =
      await this.getMerchantLiabilityAccount(merchantId);

    // 2. Execute Financial Policy (The Split)
    const grossAmount = new Decimal(amount);
    const platformFee = grossAmount
      .mul(this.COMMISSION_RATE)
      .toDecimalPlaces(2);
    const merchantDue = grossAmount.sub(platformFee);

    const entries: LedgerEntryInput[] = [
      {
        account_id: clearingAccountId,
        direction: 'DEBIT',
        amount: grossAmount.toFixed(2),
      },
      {
        account_id: merchantAccountId,
        direction: 'CREDIT',
        amount: merchantDue.toFixed(2),
      },
      {
        account_id: commissionAccountId,
        direction: 'CREDIT',
        amount: platformFee.toFixed(2),
      },
    ];

    // 3. Define Idempotency and Hash
    const idempotencyKey = `PAYMENT:${paymentId}:SETTLE`;
    const requestHash = this.generateRequestHash(
      'CUSTOMER_PAYMENT',
      paymentId,
      entries,
    );

    // 4. Post
    return this.postTransaction(
      'CUSTOMER_PAYMENT',
      'PAYMENT',
      paymentId,
      idempotencyKey,
      currency,
      entries,
      requestHash,
      null,
      manager,
    );
  }

  async postTransaction(
    txType: string,
    refType: string,
    refId: string,
    idempotencyKey: string,
    currency: string,
    entries: LedgerEntryInput[],
    requestHash: string,
    reversesTxId: string | null = null,
    manager?: EntityManager,
  ): Promise<string> {
    try {
      const query = `
        SELECT finance.post_ledger_transaction(
          $1::VARCHAR, $2::VARCHAR, $3::VARCHAR, $4::VARCHAR, $5::VARCHAR, 
          ARRAY(
            SELECT ((x->>'account_id')::UUID, (x->>'direction')::finance.entry_direction, (x->>'amount')::NUMERIC)::finance.ledger_entry_input
            FROM jsonb_array_elements($6::JSONB) x
          ),
          $7::CHAR(64), $8::UUID
        ) AS transaction_id;
      `;

      const params = [
        txType,
        refType,
        refId,
        idempotencyKey,
        currency,
        JSON.stringify(entries),
        requestHash,
        reversesTxId,
      ];

      const rawResult: unknown = manager
        ? await manager.query(query, params)
        : await this.dataSource.query(query, params);

      const result = rawResult as { transaction_id: string }[];
      return result[0].transaction_id;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(
        `Ledger Post Failed [${idempotencyKey}]: ${err.message}`,
      );
      throw new LedgerPostingError(
        `Failed to post ledger transaction: ${err.message}`,
      );
    }
  }

  async getAccountIdByCode(accountCode: string): Promise<string> {
    const result: unknown = await this.dataSource.query(
      `SELECT id FROM finance.accounts WHERE account_code = $1;`,
      [accountCode],
    );
    const rows = result as { id: string }[];
    if (!rows || !rows[0])
      throw new LedgerPostingError(`Account code '${accountCode}' not found.`);
    return rows[0].id;
  }

  async getMerchantLiabilityAccount(merchantId: string): Promise<string> {
    // Based on the strict schema, we encode the merchant ID into the account_code convention.
    // E.g., 'LIAB_MERCHANT_1234abcd'
    const expectedCode = `LIAB_MERCHANT_${merchantId.replace(/-/g, '')}`;
    const result: unknown = await this.dataSource.query(
      `SELECT id FROM finance.accounts WHERE account_code = $1;`,
      [expectedCode],
    );
    const rows = result as { id: string }[];

    // If not found, throw error. The system expects merchant ledger accounts to be provisioned during onboarding.
    if (!rows || !rows[0])
      throw new LedgerPostingError(
        `Liability account for merchant '${merchantId}' (Code: ${expectedCode}) not found.`,
      );
    return rows[0].id;
  }
}
