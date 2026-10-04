import { z } from 'zod';

// STRICT: Only explicitly declared fields are permitted. Prevents mass-assignment.
export const RegisterSchema = z
  .object({
    email: z.string().email('Invalid email format').max(320).toLowerCase(),

    // NEW: Unique username for public profiles and mentions.
    // Optional so the backend can auto-generate a fallback if omitted.
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username cannot exceed 30 characters')
      .regex(
        /^[a-zA-Z0-9_]+$/,
        'Username can only contain letters, numbers, and underscores',
      )
      .optional(),

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

// NEW: Google Auth Schema for OAuth code exchange
export const GoogleAuthSchema = z
  .object({
    code: z.string().min(1, 'Authorization code is required'),
    // Accept either a valid URL (for standard redirects) OR the literal "postmessage" (for popup flows)
    redirectUri: z
      .string()
      .refine((val) => val === 'postmessage' || val.startsWith('http'), {
        message: 'Must be a valid URL or "postmessage"',
      }),
  })
  .strict();

export type GoogleAuthInput = z.infer<typeof GoogleAuthSchema>;
