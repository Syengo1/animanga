// C:\Projects\animanga-platform\apps\web\src\lib\auth\session.ts
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const PROD_AUTH_COOKIE_NAME = "__Host-animanga_session";
export const DEV_AUTH_COOKIE_NAME = "animanga_session";

export interface SessionUser {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export async function getSessionToken(): Promise<{
  name: string;
  value: string;
} | null> {
  try {
    const cookieStore = await cookies();
    const prodCookie = cookieStore.get(PROD_AUTH_COOKIE_NAME);
    if (prodCookie?.value) {
      return { name: PROD_AUTH_COOKIE_NAME, value: prodCookie.value };
    }
    const devCookie = cookieStore.get(DEV_AUTH_COOKIE_NAME);
    if (devCookie?.value) {
      return { name: DEV_AUTH_COOKIE_NAME, value: devCookie.value };
    }
    return null;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = await getSessionToken();
  if (!token) return null;

  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_API_URL?.replace("localhost", "127.0.0.1") ||
      "http://127.0.0.1:3001";

    const res = await fetch(`${baseUrl}/api/v1/users/me`, {
      headers: {
        Cookie: `${token.name}=${token.value}`,
        Authorization: `Bearer ${token.value}`,
      },
      cache: "no-store",
    });

    if (!res.ok) return null;
    const json = await res.json();
    const data = json?.data || json;
    if (!data?.id) return null;

    return {
      id: data.id,
      email: data.email || "",
      roles: data.roles || [],
      permissions: data.permissions || [],
    };
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}
