import { z } from 'zod';

export const CanonicalWebhookSchema = z
  .object({
    provider: z.string().min(1).max(50),
    providerEventId: z.string().min(1).max(255),
    eventType: z.string().min(1).max(100),
    idempotencyKey: z.string().min(1).max(500),
    internalReferenceId: z.string().uuid(), // Strictly require the UUID string
    providerTransactionId: z.string().min(1).max(255), // Safaricom receipt
    rawPayload: z.record(z.string(), z.unknown()),
  })
  .strict();

export type CanonicalWebhookInput = z.infer<typeof CanonicalWebhookSchema>;
