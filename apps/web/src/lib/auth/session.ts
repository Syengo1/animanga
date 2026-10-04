import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const AUTH_COOKIE_NAME = "animanga_access_token";

export interface SessionUser {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export interface SessionPayload extends SessionUser {
  iat: number;
  exp: number;
  iss?: string;
}

/**
 * Safely decodes a Base64Url string (standard for JWT payloads)
 * without relying on external dependencies.
 */
function decodeBase64Url(str: string): string {
  // Pad the base64url string to be a multiple of 4
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf-8");
}

/**
 * Reads and parses the JWT from the HttpOnly cookie.
 * NOTE: This relies on the backend to verify the signature.
 * This merely decodes the payload for frontend UI/routing logic.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payloadString = decodeBase64Url(parts[1]);
    const payload = JSON.parse(payloadString) as SessionPayload;

    // Check expiration (exp is in seconds, Date.now() is in ms)
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return null;
    }

    return payload;
  } catch (error) {
    console.error("Failed to parse session token:", error);
    return null;
  }
}

/**
 * Retrieves just the user object from the current session.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getSession();
  if (!session) return null;

  return {
    id: session.id,
    email: session.email,
    roles: session.roles || [],
    permissions: session.permissions || [],
  };
}

/**
 * Route Guard: Requires an active session.
 * Redirects to the login page if unauthenticated.
 */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

/**
 * Route Guard: Requires the user to have a specific role.
 * Redirects to the customer dashboard if unauthorized.
 */
export async function requireRole(role: string): Promise<SessionPayload> {
  const session = await requireSession();

  if (!session.roles?.includes(role)) {
    redirect("/dashboard");
  }

  return session;
}

/**
 * Route Guard: Requires the user to have a specific permission.
 * Redirects to the customer dashboard if unauthorized.
 */
export async function requirePermission(
  permission: string,
): Promise<SessionPayload> {
  const session = await requireSession();

  if (!session.permissions?.includes(permission)) {
    redirect("/dashboard");
  }

  return session;
}
