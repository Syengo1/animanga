import { z } from 'zod';

// POST /v1/checkout
export const CheckoutRequestSchema = z
  .object({
    ticketTypeId: z.string().uuid('Invalid ticket type identifier'),
    quantity: z
      .number()
      .int()
      .min(1)
      .max(10, 'Cannot purchase more than 10 tickets at once'),

    // Enforce standard Kenyan mobile format (e.g., 254712345678 or 0712345678)
    phoneNumber: z
      .string()
      .regex(
        /^(?:254|\+254|0)?([171][0-9]{8})$/,
        'Invalid Kenyan phone number. Must be Safaricom/Airtel/Telkom format.',
      )
      .transform((val) => {
        // Normalize to 254 format for Daraja STK Push
        const cleaned = val.replace('+', '');
        return cleaned.startsWith('0') ? `254${cleaned.slice(1)}` : cleaned;
      }),
  })
  .strict(); // <-- FIX: Violently reject spoofed fields like 'price'

export type CheckoutRequestDto = z.infer<typeof CheckoutRequestSchema>;

// Response from POST /v1/checkout
export const CheckoutResponseSchema = z.object({
  orderId: z.string().uuid(),
  paymentId: z.string().uuid(),
  checkoutSessionId: z.string(), // Opaque ID for frontend polling
  status: z.literal('PENDING'),
  amount: z.string(),
  currency: z.literal('KES'),
  expiresAt: z.string().datetime(), // When the STK push times out and lock is released
});

export type CheckoutResponseDto = z.infer<typeof CheckoutResponseSchema>;

// GET /v1/orders/:id/payment-status
export const PaymentStatusResponseSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED']),
  message: z.string().optional(),
});

export type PaymentStatusResponseDto = z.infer<
  typeof PaymentStatusResponseSchema
>;
