import { z } from 'zod';
import {
  UuidSchema,
  CurrencySchema,
} from '../../../common/validation/identifiers.schema';
import { MoneySchema } from '../../../common/validation/money.schema';

export const CreateEventSchema = z
  .object({
    merchantId: UuidSchema,
    title: z.string().min(3).max(255),
    description: z.string().max(2000).optional(),
    startTime: z.string().datetime(), // Enforces ISO-8601 formatting
    endTime: z.string().datetime(),
    currency: CurrencySchema,
  })
  .strict();

export type CreateEventInput = z.infer<typeof CreateEventSchema>;

export const CreateTicketTypeSchema = z
  .object({
    name: z.string().min(2).max(150),
    price: MoneySchema,
    currency: CurrencySchema,
    capacity: z.number().int().positive(),
    salesCutoff: z.string().datetime().optional(),
  })
  .strict();

export type CreateTicketTypeInput = z.infer<typeof CreateTicketTypeSchema>;

// The exact endpoint for checkout reservations
export const ReserveTicketSchema = z
  .object({
    ticketTypeId: UuidSchema,
    quantity: z
      .number()
      .int()
      .positive()
      .max(10, 'Cannot reserve more than 10 tickets at once'),
    phoneNumber: z.string().min(9).max(15),
  })
  .strict();

export type ReserveTicketInput = z.infer<typeof ReserveTicketSchema>;
