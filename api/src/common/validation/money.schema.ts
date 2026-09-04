import { z } from 'zod';

// Strict enforcement: Positive or zero decimals with up to 4 decimal places. No scientific notation, no floats.
export const MoneySchema = z
  .string()
  .regex(
    /^(0|[1-9]\d*)(\.\d{1,4})?$/,
    'Invalid monetary amount. Must be a decimal string with up to 4 decimal places.',
  );
