import { z } from 'zod';

const DarajaItemSchema = z.object({
  Name: z.string(),
  Value: z.any().optional(),
});

export const DarajaStkCallbackSchema = z.object({
  Body: z.object({
    stkCallback: z.object({
      MerchantRequestID: z.string(),
      CheckoutRequestID: z.string(), // We use this as our internalReferenceId mapping
      ResultCode: z.number(),
      ResultDesc: z.string(),
      CallbackMetadata: z
        .object({
          Item: z.array(DarajaItemSchema),
        })
        .optional(),
    }),
  }),
});

export type DarajaStkCallback = z.infer<typeof DarajaStkCallbackSchema>;
