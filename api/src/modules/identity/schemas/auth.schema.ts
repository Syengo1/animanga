import { z } from 'zod';

// STRICT: Only explicitly declared fields are permitted. Prevents mass-assignment.
export const RegisterSchema = z
  .object({
    email: z.string().email('Invalid email format').max(320).toLowerCase(),
    // NIST guidelines: Enforce length over complexity to prevent dictionary attacks
    password: z
      .string()
      .min(12, 'Password must be at least 12 characters')
      .max(128),
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
  })
  .strict();

export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z
  .object({
    email: z.string().email().toLowerCase(),
    password: z.string().min(1, 'Password is required'),
  })
  .strict();

export type LoginInput = z.infer<typeof LoginSchema>;
