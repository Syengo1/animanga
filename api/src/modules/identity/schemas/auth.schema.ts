// C:\Projects\animanga-platform\api\src\modules\identity\schemas\auth.schema.ts
import { z } from 'zod';

// STRICT: Only explicitly declared fields are permitted. Prevents mass-assignment.
export const RegisterSchema = z
  .object({
    email: z.string().email('Invalid email format').max(320).toLowerCase(),

    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username cannot exceed 30 characters')
      .regex(
        /^[a-zA-Z0-9_]+$/,
        'Username can only contain letters, numbers, and underscores',
      )
      .optional(),

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

// Dual-Mode Google Auth Schema: Supports OAuth2 accessToken, idToken, or Auth-Code exchange
export const GoogleAuthSchema = z
  .object({
    code: z.string().min(1).optional(),
    redirectUri: z
      .string()
      .refine((val) => val === 'postmessage' || val.startsWith('http'), {
        message: 'Must be a valid URL or "postmessage"',
      })
      .optional(),
    accessToken: z.string().min(1).optional(),
    idToken: z.string().min(1).optional(),
  })
  .strict()
  .refine((data) => Boolean(data.accessToken || data.idToken || data.code), {
    message: 'Either accessToken, idToken, or authorization code is required',
  });

export type GoogleAuthInput = z.infer<typeof GoogleAuthSchema>;
