// C:\Projects\animanga-platform\apps\web\src\features\auth\google-auth-button.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGoogleLogin } from "@react-oauth/google";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";
import {
  DEFAULT_AUTH_REDIRECT,
  extractAuthUser,
  safeParseJson,
  type ApiAuthResponse,
} from "./auth.utils";

interface GoogleAuthButtonProps {
  label: string;
  redirectTo?: string;
  disabled?: boolean;
  onError: (message: string) => void;
  onSuccessStart?: () => void;
}

export function GoogleAuthButton({
  label,
  redirectTo = DEFAULT_AUTH_REDIRECT,
  disabled = false,
  onError,
  onSuccessStart,
}: GoogleAuthButtonProps) {
  const router = useRouter();
  const { updateUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleAuth = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsLoading(true);
      onSuccessStart?.();

      try {
        const res = await fetch("/api/v1/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ accessToken: tokenResponse.access_token }),
        });

        const resData = await safeParseJson<ApiAuthResponse>(res);
        if (!res.ok) {
          throw new Error(
            resData?.error?.message ||
              (res.status >= 500
                ? "Connection to authentication server timed out. Please try again."
                : "Google authentication failed."),
          );
        }

        const payload = extractAuthUser(resData);
        if (payload) {
          updateUser({
            id: payload.id,
            email: payload.email,
            username: payload.username,
            roles: payload.roles || [],
            permissions: payload.permissions || [],
          });
        }

        router.push(redirectTo);
        router.refresh();
      } catch (err: unknown) {
        onError(
          err instanceof Error ? err.message : "Google authentication failed.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    onError: () => {
      onError("Google authentication was cancelled or failed.");
    },
  });

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => handleGoogleAuth()}
      disabled={isLoading || disabled}
      className="w-full h-[clamp(2.35rem,4.5dvh,2.75rem)] bg-secondary/70 text-foreground hover:bg-accent border-border font-bold text-sm cursor-pointer"
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
      )}
      {label}
    </Button>
  );
}
