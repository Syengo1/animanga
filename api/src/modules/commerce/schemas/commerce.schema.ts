import { z } from 'zod';
import { MoneySchema } from '../../../common/validation/money.schema';
import {
  UuidSchema,
  CurrencySchema,
} from '../../../common/validation/identifiers.schema';

// STRICT: Only explicitly declared fields.
export const CreateMerchantSchema = z
  .object({
    businessName: z.string().min(2).max(255),
  })
  .strict();

export type CreateMerchantInput = z.infer<typeof CreateMerchantSchema>;

// STRICT: Ensures array of items is populated and quantities are positive integers
export const CreateOrderSchema = z
  .object({
    merchantId: UuidSchema,
    items: z
      .array(
        z
          .object({
            itemType: z.enum(['TICKET', 'MERCH']),
            itemId: UuidSchema,
            quantity: z.number().int().positive(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;

// STRICT: Refund must use MoneySchema
export const CreateRefundSchema = z
  .object({
    orderId: UuidSchema,
    amount: MoneySchema,
    currency: CurrencySchema,
    reason: z.string().max(500).optional(),
  })
  .strict();

export type CreateRefundInput = z.infer<typeof CreateRefundSchema>;

// STRICT: Payout must use MoneySchema
export const RequestPayoutSchema = z
  .object({
    merchantId: UuidSchema,
    amount: MoneySchema,
    currency: CurrencySchema,
    destinationReference: z.string().min(5).max(255),
  })
  .strict();

export type RequestPayoutInput = z.infer<typeof RequestPayoutSchema>;
