// C:\Projects\animanga-platform\apps\web\src\lib\api\server-fetch.ts
import "server-only";
import { getSessionToken } from "@/lib/auth/session";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace("localhost", "127.0.0.1") ||
  "http://127.0.0.1:3001";

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

export interface ServerFetchInit extends RequestInit {
  /**
   * Opt-in per-user auth forwarding.
   * Keep `false` (default) for public catalog/discovery/detail endpoints so
   * Next.js Data Cache (`next.revalidate`) actually caches responses across users.
   */
  auth?: boolean;
  timeoutMs?: number;
}

export async function serverFetch<T = unknown>(
  endpoint: string,
  init?: ServerFetchInit,
): Promise<T> {
  const { auth = false, timeoutMs = 12_000, ...fetchInit } = init ?? {};

  const isAbsolute =
    endpoint.startsWith("http://") || endpoint.startsWith("https://");
  const url = isAbsolute
    ? new URL(endpoint).toString()
    : new URL(endpoint, API_BASE_URL).toString();

  const headers = new Headers(fetchInit.headers);

  if (!headers.has("Content-Type") && !(fetchInit.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  headers.set("x-request-source", "animanga-web-server");

  if (auth) {
    const sessionCookie = await getSessionToken();
    if (sessionCookie) {
      headers.set("Cookie", `${sessionCookie.name}=${sessionCookie.value}`);
      headers.set("Authorization", `Bearer ${sessionCookie.value}`);
    }
  }

  const response = await fetch(url, {
    ...fetchInit,
    headers,
    signal: fetchInit.signal ?? AbortSignal.timeout(timeoutMs),
  });

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

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}
