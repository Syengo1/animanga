// C:\Projects\animanga-platform\apps\web\src\lib\api\server-fetch.ts

import "server-only";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME } from "@/lib/auth/session";

// Global IPv4 Override: Forces Node.js to use 127.0.0.1 instead of hanging on IPv6 (::1) localhost
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace("localhost", "127.0.0.1") ||
  "http://127.0.0.1:3001";

/**
 * Custom Error class to handle API failures gracefully in Server Components
 */
export class ServerFetchError extends Error {
  public status: number;
  public payload?: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = "ServerFetchError";
    this.status = status;
    this.payload = payload;
  }
}

/**
 * A hardened, server-side-only fetch wrapper.
 * Automatically injects the user's stateful session token into the Cookie header.
 *
 * @param endpoint - The API route (e.g., '/api/v1/users/me')
 * @param init - Standard RequestInit options + Next.js specific cache options
 */
export async function serverFetch<T = unknown>(
  endpoint: string,
  init?: RequestInit,
): Promise<T> {
  // 1. Resolve the absolute URL robustly using the native URL constructor
  const isAbsolute =
    endpoint.startsWith("http://") || endpoint.startsWith("https://");
  const url = isAbsolute
    ? new URL(endpoint).toString()
    : new URL(endpoint, API_BASE_URL).toString();

  // 2. Prepare headers
  const headers = new Headers(init?.headers);

  // EFFICIENCY FIX: Only force application/json if the user isn't sending FormData (e.g. file uploads)
  if (!headers.has("Content-Type") && !(init?.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  // Add tracing for backend debugging (matches your NestJS RequestIdMiddleware)
  headers.set("x-request-source", "animanga-web-server");

  // 3. Extract session token safely
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (token) {
      // Primary mechanism: Inject as a Cookie so NestJS cookie-parser picks it up natively
      headers.set("Cookie", `${AUTH_COOKIE_NAME}=${token}`);

      // Secondary mechanism: Keep Bearer fallback mapped to our AuthGuard logic
      headers.set("Authorization", `Bearer ${token}`);
    }
  } catch (error) {
    // Graceful fallback: If called during static build generation, cookies() throws.
    // This catches it so the Vercel build doesn't crash.
    console.warn(
      "Static rendering context detected. Skipping cookie injection.",
      error,
    );
  }

  // 4. Execute the fetch request
  const response = await fetch(url, {
    ...init,
    headers,
  });

  // 5. Intercept standard HTTP errors
  if (!response.ok) {
    let errorPayload: unknown;
    try {
      errorPayload = await response.json();
    } catch {
      errorPayload = await response.text();
    }

    throw new ServerFetchError(
      `API Request Failed: ${response.statusText} (${response.status})`,
      response.status,
      errorPayload,
    );
  }

  // 6. Handle empty 204 No Content responses safely
  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}
