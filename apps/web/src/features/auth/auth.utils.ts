// C:\Projects\animanga-platform\apps\web\src\features\auth\auth.utils.ts
import * as z from "zod";

export const DEFAULT_AUTH_REDIRECT = "/dashboard";
export const PENDING_EMAIL_STORAGE_KEY = "animanga:pending_registration_email";
export const PENDING_CONTEXT_TOKEN_KEY = "animanga:pending_verification_token";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .max(255, "Email is too long"),
  password: z
    .string()
    .min(1, "Password is required")
    .max(100, "Password is too long"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name is too long")
    .regex(/^[a-zA-Z\s]*$/, "Name can only contain letters and spaces"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username cannot exceed 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores")
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .max(255, "Email is too long"),
  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .max(100, "Password is too long")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[a-z]/, "Must contain at least one lowercase letter")
    .regex(/[0-9]/, "Must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Must contain at least one special character"),
});

export type RegisterFormData = z.infer<typeof registerSchema>;

export interface AuthUserPayload {
  id: string;
  email: string;
  username: string;
  roles: string[];
  permissions: string[];
}

export interface ApiAuthResponse {
  success?: boolean;
  message?: string;
  data?: AuthUserPayload | { data?: AuthUserPayload };
  error?: {
    code?: number | string;
    message?: string;
    verificationContextToken?: string;
    suggestions?: string[];
    errors?: Array<{ message: string }>;
  };
}

export interface RegistrationStatusPayload {
  status: "PENDING_EMAIL_VERIFICATION" | "ACTIVE" | "SUSPENDED" | "DISABLED";
  email: string;
  username: string;
  emailVerifiedAt: string | null;
  registeredAt: string;
  message: string;
}

export type RegisterViewState =
  | "idle"
  | "success"
  | "status_check"
  | "verifying"
  | "verified"
  | "expired"
  | "already_used"
  | "invalid"
  | "network_error"
  | "error";

export async function safeParseJson<T>(res: Response): Promise<T | null> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function extractAuthUser(
  resData: ApiAuthResponse | null,
): AuthUserPayload | null {
  if (!resData?.data) return null;
  const candidate = resData.data as Record<string, unknown>;
  if (
    "data" in candidate &&
    candidate.data &&
    typeof candidate.data === "object"
  ) {
    return candidate.data as AuthUserPayload;
  }
  return resData.data as AuthUserPayload;
}

/**
 * Prevents open-redirect vulnerabilities and defaults post-auth navigation to /dashboard.
 */
export function sanitizeCallbackUrl(rawUrl: string | null): string {
  if (!rawUrl || !rawUrl.startsWith("/") || rawUrl.startsWith("//")) {
    return DEFAULT_AUTH_REDIRECT;
  }
  if (rawUrl.startsWith("/login") || rawUrl.startsWith("/register")) {
    return DEFAULT_AUTH_REDIRECT;
  }
  return rawUrl;
}

export function evaluatePasswordStrength(pwd: string) {
  const checks = {
    length: pwd.length >= 12,
    casing: /[A-Z]/.test(pwd) && /[a-z]/.test(pwd),
    number: /[0-9]/.test(pwd),
    special: /[^A-Za-z0-9]/.test(pwd),
  };
  const score =
    Number(checks.length) +
    Number(checks.casing) +
    Number(checks.number) +
    Number(checks.special);
  return { checks, score };
}
