import { z } from 'zod';

// Strict UUID enforcing UUIDv4 formatting
export const UuidSchema = z.string().uuid('Invalid UUID format');

// Strict currency enum (Currently locked to KES for the Kenyan operating model)
export const CurrencySchema = z.literal('KES');
