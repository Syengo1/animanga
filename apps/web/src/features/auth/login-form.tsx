// C:\Projects\animanga-platform\apps\web\src\features\auth\login-form.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Flame,
  Eye,
  EyeOff,
  Loader2,
  Check,
  MailWarning,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";
import { GoogleAuthButton } from "./google-auth-button";
import {
  PENDING_EMAIL_STORAGE_KEY,
  PENDING_CONTEXT_TOKEN_KEY,
  loginSchema,
  safeParseJson,
  extractAuthUser,
  sanitizeCallbackUrl,
  type LoginFormData,
  type ApiAuthResponse,
} from "./auth.utils";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { updateUser } = useAuth();
  const callbackUrl = sanitizeCallbackUrl(searchParams.get("callbackUrl"));

  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isUnverified, setIsUnverified] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginFormData) => {
    setApiError(null);
    setIsUnverified(false);

    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      const resData = await safeParseJson<ApiAuthResponse>(res);

      if (!res.ok) {
        const errorMessage =
          resData?.error?.message ||
          resData?.message ||
          (res.status >= 500
            ? "Server is temporarily busy. Please try again in a moment."
            : "Invalid credentials. Please try again.");

        if (
          res.status === 401 &&
          (resData?.error?.code === "EMAIL_NOT_VERIFIED" ||
            errorMessage.toLowerCase().includes("verify your email"))
        ) {
          setIsUnverified(true);
          try {
            sessionStorage.setItem(
              PENDING_EMAIL_STORAGE_KEY,
              data.email.trim().toLowerCase(),
            );
            if (resData?.error?.verificationContextToken) {
              sessionStorage.setItem(
                PENDING_CONTEXT_TOKEN_KEY,
                resData.error.verificationContextToken,
              );
            }
          } catch {
            // Ignore storage errors
          }
          throw new Error("Your account requires email verification.");
        }

        throw new Error(errorMessage);
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

      setIsSuccess(true);
      router.push(callbackUrl);
      router.refresh();
    } catch (err: unknown) {
      setApiError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
    }
  };

  return (
    <>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-[clamp(0.75rem,2dvh,1.25rem)]"
      >
        <div className="space-y-1">
          <label className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Email
          </label>
          <Input
            type="email"
            {...register("email")}
            placeholder="goku@capsulecorp.com"
            className="h-[clamp(2.4rem,4.8dvh,2.75rem)] bg-background/70 border-border focus-visible:ring-primary text-sm"
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center gap-2">
            <label className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Password
            </label>
            <Link
              href="/register?status=check"
              className="text-[10px] sm:text-xs text-primary hover:underline font-semibold"
            >
              Didn&apos;t receive activation email?
            </Link>
          </div>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              {...register("password")}
              placeholder="••••••••••••"
              className="h-[clamp(2.4rem,4.8dvh,2.75rem)] bg-background/70 border-border focus-visible:ring-primary pr-10 text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>

        {isUnverified ? (
          <div className="p-3.5 text-xs text-warning bg-warning/10 border border-warning/30 rounded-xl flex flex-col gap-2">
            <div className="flex items-center gap-2 font-bold">
              <MailWarning className="w-4 h-4 shrink-0" /> Account Not Verified
            </div>
            <p className="text-foreground/85 leading-relaxed">
              Please check your inbox for the activation link we sent when you
              registered. If you don&apos;t see it, check your{" "}
              <strong className="text-foreground">Spam or Promotions</strong>{" "}
              folder.
            </p>
            <Link
              href="/register?status=check"
              className="inline-flex items-center gap-1.5 font-bold text-primary hover:underline w-fit"
            >
              <span>Check registration status &amp; resend link</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          apiError && (
            <div className="p-2.5 text-xs sm:text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2">
              <Flame className="w-4 h-4 shrink-0" /> {apiError}
            </div>
          )
        )}

        <Button
          type="submit"
          disabled={isSubmitting || isSuccess}
          className={cn(
            "w-full h-[clamp(2.4rem,4.8dvh,2.75rem)] mt-1 font-bold text-sm sm:text-base transition-all duration-300 cursor-pointer",
            isSuccess
              ? "bg-success hover:bg-success/90 text-success-foreground"
              : "bg-primary hover:bg-primary/90 text-primary-foreground",
          )}
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isSuccess ? (
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4" /> Opening Dashboard...
            </span>
          ) : (
            "Sign In"
          )}
        </Button>
      </form>

      <div className="relative my-[clamp(1rem,2.5dvh,1.5rem)]">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
          <span className="bg-card px-2.5 text-muted-foreground rounded-full">
            Or continue with
          </span>
        </div>
      </div>

      <GoogleAuthButton
        label="Sign in with Google"
        redirectTo={callbackUrl}
        disabled={isSubmitting || isSuccess}
        onSuccessStart={() => {
          setApiError(null);
          setIsUnverified(false);
        }}
        onError={(msg) => setApiError(msg)}
      />

      <p className="text-[clamp(0.75rem,1.5dvh,0.875rem)] text-center text-muted-foreground mt-[clamp(1rem,2.5dvh,1.5rem)]">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="text-primary hover:text-primary/80 font-bold transition-colors"
        >
          Register here
        </Link>
      </p>
    </>
  );
}
