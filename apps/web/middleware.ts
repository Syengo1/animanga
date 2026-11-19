// C:\Projects\animanga-platform\apps\web\middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROD_AUTH_COOKIE_NAME = "__Host-animanga_session";
const DEV_AUTH_COOKIE_NAME = "animanga_session";

const protectedRoutes = [
  "/dashboard",
  "/tickets",
  "/orders",
  "/library",
  "/wishlist",
  "/settings",
  "/profile",
  "/checkout",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route),
  );

  const hasSession =
    Boolean(request.cookies.get(PROD_AUTH_COOKIE_NAME)?.value) ||
    Boolean(request.cookies.get(DEV_AUTH_COOKIE_NAME)?.value);

  // 1. Protect authenticated routes
  if (isProtectedRoute && !hasSession) {
    const url = new URL("/login", request.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // 2. Redirect authenticated users away from auth pages to /dashboard (unless verifying a token)
  const hasVerifyToken = request.nextUrl.searchParams.has("token");
  if (
    (pathname === "/login" || (pathname === "/register" && !hasVerifyToken)) &&
    hasSession
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|assets|fonts).*)",
  ],
};
