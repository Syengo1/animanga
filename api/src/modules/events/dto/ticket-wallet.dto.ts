import { z } from 'zod';

export const TicketWalletPresentationSchema = z.object({
  id: z.string().uuid(),
  ticketNumber: z.string(), // e.g., "ANM-0001" (derived from sequence_number)
  event: z.object({
    id: z.string().uuid(),
    title: z.string(),
    startTime: z.string().datetime(),
    venue: z.string().optional(), // Prepared for when we add venues
  }),
  ticketType: z.string(), // e.g., "VIP"
  status: z.enum(['ISSUED', 'SCANNED', 'REVOKED', 'REFUNDED']),
  credential: z.object({
    // FIX: Zod v4 requires explicit key and value types for records
    payload: z.record(z.string(), z.unknown()),
    signature: z.string(),
  }),
});

export type TicketWalletPresentationDto = z.infer<
  typeof TicketWalletPresentationSchema
>;

export const TicketWalletListResponseSchema = z.object({
  tickets: z.array(TicketWalletPresentationSchema),
});

export type TicketWalletListResponseDto = z.infer<
  typeof TicketWalletListResponseSchema
>;
