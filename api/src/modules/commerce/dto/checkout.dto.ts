// C:\Projects\animanga-platform\api\src\modules\commerce\dto\checkout.dto.ts
import { z } from 'zod';

export const CheckoutRequestSchema = z
  .object({
    ticketTypeId: z.string().uuid('Invalid ticket type identifier'),
    quantity: z
      .number()
      .int()
      .min(1)
      .max(10, 'Cannot purchase more than 10 tickets at once'),
    phoneNumber: z
      .string()
      .regex(
        /^(?:254|\+254|0)?([17][0-9]{8})$/,
        'Invalid Kenyan phone number. Must be Safaricom/Airtel/Telkom format.',
      )
      .transform((val) => {
        const digits = val.replace(/\D/g, '');
        if (digits.startsWith('0')) return `254${digits.slice(1)}`;
        if (digits.length === 9) return `254${digits}`;
        return digits;
      }),
  })
  .strict();

export type CheckoutRequestDto = z.infer<typeof CheckoutRequestSchema>;

export const CheckoutResponseSchema = z.object({
  orderId: z.string().uuid(),
  paymentId: z.string().uuid(),
  checkoutSessionId: z.string(),
  status: z.literal('PENDING'),
  amount: z.string(),
  currency: z.literal('KES'),
  expiresAt: z.string().datetime(),
});

export type CheckoutResponseDto = z.infer<typeof CheckoutResponseSchema>;

export const PaymentStatusResponseSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED']),
  message: z.string().optional(),
});

export type PaymentStatusResponseDto = z.infer<
  typeof PaymentStatusResponseSchema
>;
