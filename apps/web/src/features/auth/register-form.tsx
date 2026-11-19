// C:\Projects\animanga-platform\apps\web\src\features\auth\register-form.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Flame, Eye, EyeOff, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GoogleAuthButton } from "./google-auth-button";
import { PasswordStrengthMeter } from "./password-strength-meter";
import { VerificationStatusViews } from "./verification-status-views";
import {
  DEFAULT_AUTH_REDIRECT,
  PENDING_EMAIL_STORAGE_KEY,
  PENDING_CONTEXT_TOKEN_KEY,
  registerSchema,
  safeParseJson,
  evaluatePasswordStrength,
  type RegisterFormData,
  type RegisterViewState,
  type RegistrationStatusPayload,
} from "./auth.utils";

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token");
  const statusModeFromUrl = searchParams.get("status");

  const attemptedTokenRef = useRef<string | null>(null);
  const verificationSucceededRef = useRef(false);

  const [viewState, setViewState] = useState<RegisterViewState>(
    tokenFromUrl
      ? "verifying"
      : statusModeFromUrl === "check"
        ? "status_check"
        : "idle",
  );
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [resendEmail, setResendEmail] = useState("");
  const [contextToken, setContextToken] = useState<string | null>(null);
  const [statusData, setStatusData] =
    useState<RegistrationStatusPayload | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendFeedback, setResendFeedback] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", username: "", email: "", password: "" },
  });

  const currentPassword = watch("password", "");
  const { score: strengthScore } = evaluatePasswordStrength(currentPassword);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(
      () => setResendCooldown((prev) => Math.max(0, prev - 1)),
      1000,
    );
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const fetchAuthenticatedStatus = useCallback(async (signedToken: string) => {
    if (!signedToken) return;
    setIsCheckingStatus(true);
    setApiError(null);

    try {
      const res = await fetch(
        `/api/v1/auth/status?contextToken=${encodeURIComponent(signedToken)}`,
      );
      const json = await safeParseJson<{ data?: RegistrationStatusPayload }>(
        res,
      );

      if (!res.ok) {
        setContextToken(null);
        setStatusData(null);
        try {
          sessionStorage.removeItem(PENDING_CONTEXT_TOKEN_KEY);
        } catch {
          // Ignore
        }
        return;
      }

      const payload = (json?.data || json) as RegistrationStatusPayload;
      setStatusData(payload);
      if (payload?.email) setResendEmail(payload.email);

      if (payload?.status === "ACTIVE") {
        try {
          sessionStorage.removeItem(PENDING_EMAIL_STORAGE_KEY);
          sessionStorage.removeItem(PENDING_CONTEXT_TOKEN_KEY);
        } catch {
          // Ignore
        }
      }
    } catch {
      setApiError("Unable to refresh verification status right now.");
    } finally {
      setIsCheckingStatus(false);
    }
  }, []);

  // Restore saved verification context on refresh
  useEffect(() => {
    if (tokenFromUrl) return;
    let savedEmail = "";
    let savedToken: string | null = null;
    try {
      savedEmail = sessionStorage.getItem(PENDING_EMAIL_STORAGE_KEY) || "";
      savedToken = sessionStorage.getItem(PENDING_CONTEXT_TOKEN_KEY);
    } catch {
      // Ignore
    }

    if (savedEmail) setResendEmail(savedEmail);
    if (savedToken) {
      setContextToken(savedToken);
      setViewState(statusModeFromUrl === "check" ? "status_check" : "success");
      void fetchAuthenticatedStatus(savedToken);
    } else if (statusModeFromUrl === "check") {
      setViewState("status_check");
    }
  }, [tokenFromUrl, statusModeFromUrl, fetchAuthenticatedStatus]);

  // Verify token from email link
  useEffect(() => {
    if (!tokenFromUrl || attemptedTokenRef.current === tokenFromUrl) return;
    attemptedTokenRef.current = tokenFromUrl;

    const verifyToken = async () => {
      try {
        const res = await fetch("/api/v1/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: tokenFromUrl }),
        });

        const body = await safeParseJson<Record<string, unknown>>(res);
        if (res.ok) {
          verificationSucceededRef.current = true;
          try {
            sessionStorage.removeItem(PENDING_EMAIL_STORAGE_KEY);
            sessionStorage.removeItem(PENDING_CONTEXT_TOKEN_KEY);
          } catch {
            // Ignore
          }
          setViewState("verified");
          return;
        }

        const errObj = body?.error as Record<string, unknown> | undefined;
        const msgObj = body?.message as Record<string, unknown> | undefined;
        const code = String(errObj?.code || msgObj?.code || body?.code || "");

        if (code === "VERIFICATION_TOKEN_ALREADY_USED") {
          if (!verificationSucceededRef.current) setViewState("already_used");
        } else if (code === "VERIFICATION_TOKEN_EXPIRED") {
          setViewState("expired");
        } else if (code === "VERIFICATION_TOKEN_INVALID") {
          setViewState("invalid");
        } else {
          setViewState("error");
        }
      } catch {
        setViewState("network_error");
      }
    };

    void verifyToken();
  }, [tokenFromUrl]);

  const onSubmit = async (data: RegisterFormData) => {
    setApiError(null);
    setSuggestions([]);
    const normalizedEmail = data.email.trim().toLowerCase();
    setResendEmail(normalizedEmail);

    const nameParts = data.name.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName =
      nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined;

    try {
      const res = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          username: data.username || undefined,
          password: data.password,
          firstName,
          lastName,
        }),
      });

      const resData = await safeParseJson<{
        data?: { verificationContextToken?: string; message?: string };
        message?: string;
        error?: {
          message?: string;
          suggestions?: string[];
          errors?: Array<{ message: string }>;
        };
      }>(res);

      if (!res.ok) {
        if (res.status === 409 && resData?.error?.suggestions) {
          setSuggestions(resData.error.suggestions);
          throw new Error(resData.error.message || "Username is taken");
        }
        const msg = resData?.error?.errors?.length
          ? resData.error.errors.map((e) => e.message).join(", ")
          : resData?.error?.message ||
            resData?.message ||
            "Registration failed. Please try again.";
        throw new Error(msg);
      }

      const issuedContextToken = resData?.data?.verificationContextToken;
      try {
        sessionStorage.setItem(PENDING_EMAIL_STORAGE_KEY, normalizedEmail);
        if (issuedContextToken) {
          sessionStorage.setItem(PENDING_CONTEXT_TOKEN_KEY, issuedContextToken);
        }
      } catch {
        // Ignore
      }

      if (issuedContextToken) {
        setContextToken(issuedContextToken);
        void fetchAuthenticatedStatus(issuedContextToken);
      }
      setResendFeedback(resData?.data?.message || null);
      setResendCooldown(45);
      setViewState("success");
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : "Registration failed.");
    }
  };

  const handleResendLink = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const cleaned = resendEmail.trim().toLowerCase();
    if (!cleaned) return;

    setIsResending(true);
    setResendFeedback(null);
    setApiError(null);

    try {
      const res = await fetch("/api/v1/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleaned }),
      });

      const json = await safeParseJson<{
        data?: { message?: string };
        message?: string;
        error?: { message?: string };
      }>(res);

      if (!res.ok) {
        throw new Error(
          json?.error?.message ||
            json?.message ||
            "Could not process request right now. Please wait and try again.",
        );
      }

      setResendFeedback(
        json?.data?.message ||
          "If an unverified account is associated with this email, a fresh activation link has been sent.",
      );
      setResendCooldown(45);
      if (contextToken) await fetchAuthenticatedStatus(contextToken);
    } catch (err: unknown) {
      setApiError(
        err instanceof Error
          ? err.message
          : "Failed to request verification link.",
      );
    } finally {
      setIsResending(false);
    }
  };

  const handleResetToRegister = () => {
    try {
      sessionStorage.removeItem(PENDING_EMAIL_STORAGE_KEY);
      sessionStorage.removeItem(PENDING_CONTEXT_TOKEN_KEY);
    } catch {
      // Ignore
    }
    setContextToken(null);
    setStatusData(null);
    setResendFeedback(null);
    setApiError(null);
    setViewState("idle");
    router.replace("/register");
  };

  if (viewState !== "idle") {
    return (
      <VerificationStatusViews
        viewState={viewState}
        resendEmail={resendEmail}
        onResendEmailChange={setResendEmail}
        contextToken={contextToken}
        statusData={statusData}
        isCheckingStatus={isCheckingStatus}
        isResending={isResending}
        resendFeedback={resendFeedback}
        resendCooldown={resendCooldown}
        apiError={apiError}
        onRefreshStatus={() =>
          contextToken && void fetchAuthenticatedStatus(contextToken)
        }
        onResendLink={(e) => void handleResendLink(e)}
        onSwitchToStatusCheck={() => setViewState("status_check")}
        onResetToRegister={handleResetToRegister}
      />
    );
  }

  return (
    <>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-[clamp(0.5rem,1.2dvh,0.9rem)]"
      >
        <div className="space-y-1">
          <label className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Full Name
          </label>
          <Input
            type="text"
            {...register("name")}
            placeholder="Monkey D. Luffy"
            className="h-[clamp(2.25rem,4dvh,2.5rem)] bg-background/70 border-border focus-visible:ring-primary text-sm"
          />
          {errors.name && (
            <p className="text-[10px] text-destructive">
              {errors.name.message}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex justify-between">
            <span>Username</span>
            <span className="text-muted-foreground/60 normal-case">
              (Optional)
            </span>
          </label>
          <Input
            type="text"
            {...register("username")}
            placeholder="joyboy_2026"
            className="h-[clamp(2.25rem,4dvh,2.5rem)] bg-background/70 border-border focus-visible:ring-primary text-sm"
          />
          {errors.username && (
            <p className="text-[10px] text-destructive">
              {errors.username.message}
            </p>
          )}

          {suggestions.length > 0 && (
            <div className="mt-1.5 p-2.5 bg-primary/10 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-1.5 mb-1.5 text-xs font-bold text-primary">
                <Sparkles className="size-3" />
                <span>Try one of these instead:</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {suggestions.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => {
                      setValue("username", sug, { shouldValidate: true });
                      setSuggestions([]);
                      setApiError(null);
                    }}
                    className="text-[11px] py-1 px-2 bg-background/70 hover:bg-primary/20 border border-border rounded text-foreground truncate cursor-pointer"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Email
          </label>
          <Input
            type="email"
            {...register("email")}
            placeholder="goku@capsulecorp.com"
            className="h-[clamp(2.25rem,4dvh,2.5rem)] bg-background/70 border-border focus-visible:ring-primary text-sm"
          />
          {errors.email && (
            <p className="text-[10px] text-destructive">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Password
          </label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              {...register("password")}
              placeholder="••••••••••••"
              className="h-[clamp(2.25rem,4dvh,2.5rem)] bg-background/70 border-border focus-visible:ring-primary pr-10 text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          <PasswordStrengthMeter password={currentPassword} />
        </div>

        {apiError && (
          <div className="p-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2">
            <Flame className="w-4 h-4 shrink-0" /> {apiError}
          </div>
        )}

        <Button
          type="submit"
          disabled={
            isSubmitting || (currentPassword.length > 0 && strengthScore < 4)
          }
          className="w-full h-[clamp(2.35rem,4.2dvh,2.6rem)] mt-0.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm cursor-pointer disabled:opacity-50"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            "Create Account"
          )}
        </Button>
      </form>

      <div className="relative my-[clamp(0.75rem,2dvh,1.15rem)]">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-[9px] font-bold uppercase tracking-wider">
          <span className="bg-card px-2.5 text-muted-foreground rounded-full">
            Or continue with
          </span>
        </div>
      </div>

      <GoogleAuthButton
        label="Sign up with Google"
        redirectTo={DEFAULT_AUTH_REDIRECT}
        disabled={isSubmitting}
        onSuccessStart={() => setApiError(null)}
        onError={(msg) => setApiError(msg)}
      />

      <div className="flex items-center justify-between text-[clamp(0.7rem,1.5dvh,0.82rem)] text-muted-foreground mt-[clamp(0.75rem,2dvh,1.15rem)]">
        <span>
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-primary hover:text-primary/80 font-bold"
          >
            Sign in
          </Link>
        </span>
        <button
          type="button"
          onClick={() => setViewState("status_check")}
          className="text-primary hover:underline font-bold cursor-pointer"
        >
          Resend activation link
        </button>
      </div>
    </>
  );
}
