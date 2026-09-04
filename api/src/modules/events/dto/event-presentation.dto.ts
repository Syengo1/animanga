import { z } from 'zod';

// Public representation of a Ticket Type
export const TicketTypePresentationSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  price: z.string(), // Formatted as strict decimal string to prevent float dust
  currency: z.literal('KES'),
  isSoldOut: z.boolean(),
});

export type TicketTypePresentationDto = z.infer<
  typeof TicketTypePresentationSchema
>;

// Public representation of an Event
export const EventPresentationSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  status: z.enum(['PUBLISHED', 'ON_SALE', 'SOLD_OUT', 'COMPLETED']),
  ticketTypes: z.array(TicketTypePresentationSchema),
  // Future expansions (when Content domain is built):
  // venue: z.string(),
  // coverImageUrl: z.string().url(),
});

export type EventPresentationDto = z.infer<typeof EventPresentationSchema>;

export const EventListResponseSchema = z.array(EventPresentationSchema);
export type EventListResponseDto = z.infer<typeof EventListResponseSchema>;
