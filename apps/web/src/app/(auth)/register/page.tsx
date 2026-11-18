// C:\Projects\animanga-platform\apps\web\src\app\(auth)\register\page.tsx
"use client";

import { useState, useEffect, Suspense, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Flame,
  Eye,
  EyeOff,
  Loader2,
  Check,
  X,
  Sparkles,
  MailX,
  Send,
  AlertCircle,
  MailWarning,
  RefreshCw,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import { useGoogleLogin } from "@react-oauth/google";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";

const PENDING_EMAIL_STORAGE_KEY = "animanga:pending_registration_email";
const PENDING_CONTEXT_TOKEN_KEY = "animanga:pending_verification_token";

const registerSchema = z.object({
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

type RegisterFormData = z.infer<typeof registerSchema>;

interface RegistrationStatusPayload {
  status: "PENDING_EMAIL_VERIFICATION" | "ACTIVE" | "SUSPENDED" | "DISABLED";
  email: string;
  username: string;
  emailVerifiedAt: string | null;
  registeredAt: string;
  message: string;
}

async function safeParseJson<T>(res: Response): Promise<T | null> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

const getPasswordStrength = (pwd: string) => {
  let score = 0;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return score;
};

function RegisterFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { updateUser } = useAuth();

  const tokenFromUrl = searchParams.get("token");
  const statusModeFromUrl = searchParams.get("status");

  const attemptedTokenRef = useRef<string | null>(null);
  const verificationSucceededRef = useRef(false);

  type ViewState =
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

  const [viewState, setViewState] = useState<ViewState>(
    tokenFromUrl
      ? "verifying"
      : statusModeFromUrl === "check"
        ? "status_check"
        : "idle",
  );

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
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
    defaultValues: {
      name: "",
      username: "",
      email: "",
      password: "",
    },
  });

  const currentPassword = watch("password", "");
  const strengthScore = getPasswordStrength(currentPassword);

  const checks = {
    length: currentPassword.length >= 12,
    casing: /[A-Z]/.test(currentPassword) && /[a-z]/.test(currentPassword),
    number: /[0-9]/.test(currentPassword),
    special: /[^A-Za-z0-9]/.test(currentPassword),
  };

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
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
        // Context token expired or invalid — fall back to zero-enumeration mode
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
      if (payload?.email) {
        setResendEmail(payload.email);
      }

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

  // Restore signed verification context if user refreshes page before confirming
  useEffect(() => {
    if (tokenFromUrl) return;

    let savedEmail = "";
    let savedToken: string | null = null;
    try {
      savedEmail = sessionStorage.getItem(PENDING_EMAIL_STORAGE_KEY) || "";
      savedToken = sessionStorage.getItem(PENDING_CONTEXT_TOKEN_KEY);
    } catch {
      // Ignore storage error
    }

    if (savedEmail) {
      setResendEmail(savedEmail);
    }
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
    if (!tokenFromUrl) return;
    if (attemptedTokenRef.current === tokenFromUrl) return;

    attemptedTokenRef.current = tokenFromUrl;

    const verifyToken = async () => {
      try {
        const response = await fetch(`/api/v1/auth/verify`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token: tokenFromUrl }),
        });

        const body = await safeParseJson<Record<string, any>>(response);

        if (response.ok) {
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

        const code = body?.error?.code || body?.message?.code || body?.code;

        if (code === "VERIFICATION_TOKEN_ALREADY_USED") {
          if (!verificationSucceededRef.current) {
            setViewState("already_used");
          }
          return;
        }

        if (code === "VERIFICATION_TOKEN_EXPIRED") {
          setViewState("expired");
          return;
        }

        if (code === "VERIFICATION_TOKEN_INVALID") {
          setViewState("invalid");
          return;
        }

        setViewState("error");
      } catch {
        setViewState("network_error");
      }
    };

    void verifyToken();
  }, [tokenFromUrl]);

  const applySuggestion = (suggestion: string) => {
    setValue("username", suggestion, { shouldValidate: true });
    setSuggestions([]);
    setApiError(null);
  };

  const onSubmit = async (data: RegisterFormData) => {
    setApiError(null);
    setSuggestions([]);
    const normalizedEmail = data.email.trim().toLowerCase();
    setResendEmail(normalizedEmail);

    const nameParts = data.name.trim().split(" ");
    const firstName = nameParts[0];
    const lastName =
      nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined;

    const backendPayload = {
      email: normalizedEmail,
      username: data.username || undefined,
      password: data.password,
      firstName,
      lastName,
    };

    try {
      const res = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backendPayload),
      });

      const resData = await safeParseJson<Record<string, any>>(res);

      if (!res.ok) {
        if (res.status === 409 && resData?.error?.suggestions) {
          setSuggestions(resData.error.suggestions);
          throw new Error(resData.error.message || "Username is taken");
        }

        let errorMessage = "Registration failed. Please try again.";
        if (resData?.error?.errors && Array.isArray(resData.error.errors)) {
          errorMessage = resData.error.errors
            .map((e: { message: string }) => e.message)
            .join(", ");
        } else {
          errorMessage =
            resData?.error?.message || resData?.message || errorMessage;
        }

        throw new Error(errorMessage);
      }

      const payload = resData?.data || resData;
      const issuedContextToken = payload?.verificationContextToken as
        | string
        | undefined;

      try {
        sessionStorage.setItem(PENDING_EMAIL_STORAGE_KEY, normalizedEmail);
        if (issuedContextToken) {
          sessionStorage.setItem(PENDING_CONTEXT_TOKEN_KEY, issuedContextToken);
        }
      } catch {
        // Ignore storage error
      }

      if (issuedContextToken) {
        setContextToken(issuedContextToken);
        void fetchAuthenticatedStatus(issuedContextToken);
      }

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

      const json = await safeParseJson<Record<string, any>>(res);
      const payload = json?.data || json;

      if (!res.ok) {
        throw new Error(
          json?.error?.message ||
            json?.message ||
            "Could not process request right now. Please wait a moment and try again.",
        );
      }

      setResendFeedback(
        payload?.message ||
          "If an unverified account is associated with this email, a fresh activation link has been sent. Please check your inbox and spam folder.",
      );
      setResendCooldown(45);

      if (contextToken) {
        await fetchAuthenticatedStatus(contextToken);
      }
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

  const clearSavedRegistrationAndReset = () => {
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

  const signupWithGoogle = useGoogleLogin({
    flow: "auth-code",
    onSuccess: async (codeResponse) => {
      setIsGoogleLoading(true);
      setApiError(null);

      try {
        const res = await fetch("/api/v1/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            code: codeResponse.code,
            redirectUri: "postmessage",
          }),
        });

        const resData = await safeParseJson<Record<string, any>>(res);

        if (!res.ok) {
          throw new Error(
            resData?.error?.message ||
              (res.status >= 500
                ? "Connection to authentication server timed out. Please try again."
                : "Google registration failed."),
          );
        }

        const payload = resData?.data?.data || resData?.data;
        if (payload) {
          updateUser({
            id: payload.id,
            email: payload.email,
            roles: payload.roles || [],
            permissions: payload.permissions || [],
          });
        }

        router.push("/tickets");
        router.refresh();
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Google signup failed.";
        setApiError(message);
      } finally {
        setIsGoogleLoading(false);
      }
    },
    onError: () => {
      setApiError("Google Sign-up was cancelled or failed.");
    },
  });

  // ---------------------------------------------------------------------------
  // DYNAMIC RENDER BLOCKS BASED ON STATE
  // ---------------------------------------------------------------------------

  if (viewState === "verifying") {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="size-12 animate-spin text-primary" />
        <h3 className="text-xl font-bold text-foreground">
          Verifying your link...
        </h3>
        <p className="text-sm text-muted-foreground">
          Please wait while we activate your account.
        </p>
      </div>
    );
  }

  if (viewState === "verified") {
    return (
      <div className="animate-in zoom-in duration-500 flex flex-col items-center justify-center py-8 text-center space-y-6">
        <div className="size-20 rounded-full bg-success/20 flex items-center justify-center border border-success/30">
          <Check className="size-10 text-success" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-foreground mb-2">
            Account Verified!
          </h3>
          <p className="text-sm text-muted-foreground">
            Welcome to Animanga. Your identity is secured and you are ready to
            sign in.
          </p>
        </div>
        <Button
          onClick={() => router.push("/login")}
          className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base cursor-pointer"
        >
          Proceed to Login
        </Button>
      </div>
    );
  }

  if (viewState === "already_used") {
    return (
      <div className="animate-in fade-in duration-500 flex flex-col items-center justify-center py-8 text-center space-y-6">
        <div className="size-20 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
          <Check className="size-10 text-primary" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-foreground mb-2">
            Already Verified
          </h3>
          <p className="text-sm text-muted-foreground">
            This account has already been activated. You can safely proceed to
            login.
          </p>
        </div>
        <Button
          onClick={() => router.push("/login")}
          className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base cursor-pointer"
        >
          Proceed to Login
        </Button>
      </div>
    );
  }

  if (viewState === "expired") {
    return (
      <div className="animate-in fade-in duration-500 flex flex-col items-center justify-center py-8 text-center space-y-6">
        <div className="size-20 rounded-full bg-destructive/20 flex items-center justify-center border border-destructive/30">
          <MailX className="size-10 text-destructive" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-foreground mb-2">
            Link Expired
          </h3>
          <p className="text-sm text-muted-foreground">
            This verification link has expired. Request a fresh 24-hour
            activation link below.
          </p>
        </div>
        <Button
          onClick={() => setViewState("status_check")}
          variant="outline"
          className="w-full h-12 border-primary text-primary hover:bg-primary/10 font-bold cursor-pointer"
        >
          <Send className="w-4 h-4 mr-2" /> Request New Verification Link
        </Button>
      </div>
    );
  }

  if (viewState === "invalid") {
    return (
      <div className="animate-in fade-in duration-500 flex flex-col items-center justify-center py-8 text-center space-y-6">
        <div className="size-20 rounded-full bg-destructive/20 flex items-center justify-center border border-destructive/30">
          <AlertCircle className="size-10 text-destructive" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-foreground mb-2">
            Invalid Link
          </h3>
          <p className="text-sm text-muted-foreground">
            We couldn&apos;t recognize this verification link. Ensure you copied
            the full URL from your email.
          </p>
        </div>
        <Button
          onClick={() => setViewState("status_check")}
          variant="outline"
          className="w-full h-12 border-primary text-primary hover:bg-primary/10 font-bold cursor-pointer"
        >
          Request Fresh Verification Link
        </Button>
      </div>
    );
  }

  if (viewState === "network_error" || viewState === "error") {
    return (
      <div className="animate-in fade-in duration-500 flex flex-col items-center justify-center py-8 text-center space-y-6">
        <div className="size-20 rounded-full bg-destructive/20 flex items-center justify-center border border-destructive/30">
          <AlertCircle className="size-10 text-destructive" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-foreground mb-2">
            Connection Error
          </h3>
          <p className="text-sm text-muted-foreground">
            We couldn&apos;t verify your email right now. Please check your
            connection and try again.
          </p>
        </div>
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          className="w-full h-12 border-primary text-primary hover:bg-primary/10 font-bold cursor-pointer"
        >
          Retry Verification
        </Button>
      </div>
    );
  }

  // ===========================================================================
  // PRIVACY-SAFE VERIFICATION & STATUS HUB
  // ===========================================================================
  if (viewState === "success" || viewState === "status_check") {
    const isVerified = statusData?.status === "ACTIVE";
    const hasAuthenticatedContext = Boolean(contextToken && statusData);

    return (
      <div className="animate-in fade-in duration-300 flex flex-col space-y-5 py-2">
        {hasAuthenticatedContext ? (
          isVerified ? (
            <div className="p-4 rounded-xl bg-success/10 border border-success/30 text-left space-y-3">
              <div className="flex items-center gap-2 text-success font-bold text-sm">
                <Check className="w-5 h-5 shrink-0" />
                <span>Account Verified &amp; Active</span>
              </div>
              <p className="text-xs text-foreground/85 leading-relaxed">
                Your account (
                <span className="font-bold">{statusData?.email}</span>) is
                verified and ready. You can sign in right away.
              </p>
              <Button
                onClick={() => router.push("/login")}
                className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs cursor-pointer"
              >
                Proceed to Sign In
              </Button>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-warning/10 border border-warning/30 text-left space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-warning font-bold text-sm">
                  <MailWarning className="w-5 h-5 shrink-0" />
                  <span>Awaiting Email Verification</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    contextToken && void fetchAuthenticatedStatus(contextToken)
                  }
                  disabled={isCheckingStatus}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline cursor-pointer"
                >
                  <RefreshCw
                    className={cn(
                      "w-3 h-3",
                      isCheckingStatus && "animate-spin",
                    )}
                  />
                  <span>Refresh Status</span>
                </button>
              </div>

              <p className="text-xs text-foreground/85 leading-relaxed">
                We sent an activation link to{" "}
                <span className="font-bold text-foreground">
                  {statusData?.email || resendEmail}
                </span>
                . Click the link in that email to activate your account.
              </p>

              <div className="p-3 rounded-lg bg-background/70 border border-border text-xs text-muted-foreground space-y-1">
                <p className="font-bold text-foreground">
                  Can&apos;t find the verification email?
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  <li>
                    Check your{" "}
                    <strong className="text-foreground">
                      Spam, Junk, or Promotions
                    </strong>{" "}
                    folder.
                  </li>
                  <li>
                    Mark the email as{" "}
                    <strong className="text-foreground">
                      &ldquo;Not Spam&rdquo;
                    </strong>{" "}
                    so the activation button is clickable.
                  </li>
                </ul>
              </div>

              {resendFeedback && (
                <div className="p-2.5 rounded-lg bg-success/15 border border-success/30 text-success text-xs font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{resendFeedback}</span>
                </div>
              )}

              {apiError && (
                <div className="p-2.5 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{apiError}</span>
                </div>
              )}

              <Button
                type="button"
                onClick={() => void handleResendLink()}
                disabled={isResending || resendCooldown > 0}
                className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs gap-2 cursor-pointer"
              >
                {isResending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending fresh link...</span>
                  </>
                ) : resendCooldown > 0 ? (
                  <span>Resend available in {resendCooldown}s</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Resend Verification Email</span>
                  </>
                )}
              </Button>
            </div>
          )
        ) : (
          /* ZERO-ENUMERATION MODE: When user has no signed contextToken */
          <form onSubmit={handleResendLink} className="space-y-4 text-left">
            <div className="p-3.5 rounded-xl bg-secondary/60 border border-border space-y-2">
              <div className="flex items-center gap-2 text-foreground font-bold text-xs sm:text-sm">
                <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                <span>Resend Activation Link</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Enter the email address you registered with. If your account is
                awaiting verification, we&apos;ll send a fresh 24-hour
                activation link to your{" "}
                <strong className="text-foreground">
                  Inbox and Spam/Promotions
                </strong>{" "}
                folder.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Email Address
              </label>
              <Input
                type="email"
                required
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                placeholder="Enter your email address..."
                className="h-10 bg-background/70 border-border text-sm"
              />
            </div>

            {resendFeedback && (
              <div className="p-3 rounded-xl bg-success/15 border border-success/30 text-success text-xs font-semibold flex items-start gap-2 leading-relaxed">
                <Check className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{resendFeedback}</span>
              </div>
            )}

            {apiError && (
              <div className="p-2.5 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{apiError}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={
                isResending || resendCooldown > 0 || !resendEmail.trim()
              }
              className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs gap-2 cursor-pointer"
            >
              {isResending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending activation link...</span>
                </>
              ) : resendCooldown > 0 ? (
                <span>Resend available in {resendCooldown}s</span>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Activation Link</span>
                </>
              )}
            </Button>
          </form>
        )}

        <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={clearSavedRegistrationAndReset}
            className="inline-flex items-center gap-1 font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Registration</span>
          </button>

          <Link
            href="/login"
            className="font-bold text-primary hover:underline"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  // DEFAULT VIEW: 'idle'
  return (
    <>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-[clamp(0.5rem,1.2dvh,1rem)]"
      >
        <div className="space-y-[clamp(0.15rem,0.5dvh,0.25rem)]">
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
            <p className="text-[10px] text-destructive leading-tight">
              {errors.name.message}
            </p>
          )}
        </div>

        <div className="space-y-[clamp(0.15rem,0.5dvh,0.25rem)]">
          <label className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex justify-between">
            <span>Username</span>
            <span className="text-muted-foreground/60 lowercase normal-case">
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
            <p className="text-[10px] text-destructive leading-tight">
              {errors.username.message}
            </p>
          )}

          {suggestions.length > 0 && (
            <div className="mt-2 p-3 bg-primary/10 border border-primary/20 rounded-lg animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-1.5 mb-2 text-xs font-bold text-primary">
                <Sparkles className="size-3" />
                <span>Try one of these instead:</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {suggestions.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => applySuggestion(sug)}
                    className="text-[11px] py-1.5 px-2 bg-background/70 hover:bg-primary/20 border border-border rounded text-foreground transition-colors truncate cursor-pointer"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-[clamp(0.15rem,0.5dvh,0.25rem)]">
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
            <p className="text-[10px] text-destructive leading-tight">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-[clamp(0.15rem,0.5dvh,0.25rem)]">
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
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>

          {currentPassword.length > 0 && (
            <div className="pt-1.5 animate-in fade-in duration-300">
              <div className="flex gap-1 h-1.5 w-full rounded-full overflow-hidden mb-1.5">
                <div
                  className={cn(
                    "h-full flex-1 transition-all duration-300",
                    strengthScore >= 1 ? "bg-destructive" : "bg-muted",
                  )}
                />
                <div
                  className={cn(
                    "h-full flex-1 transition-all duration-300",
                    strengthScore >= 2 ? "bg-warning" : "bg-muted",
                  )}
                />
                <div
                  className={cn(
                    "h-full flex-1 transition-all duration-300",
                    strengthScore >= 3 ? "bg-info" : "bg-muted",
                  )}
                />
                <div
                  className={cn(
                    "h-full flex-1 transition-all duration-300",
                    strengthScore >= 4 ? "bg-success" : "bg-muted",
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-y-0.5 gap-x-2 text-[9px] sm:text-[10px] text-muted-foreground">
                <div className="flex items-center gap-1">
                  {checks.length ? (
                    <Check className="w-3 h-3 text-success" />
                  ) : (
                    <X className="w-3 h-3 text-destructive" />
                  )}{" "}
                  12+ chars
                </div>
                <div className="flex items-center gap-1">
                  {checks.casing ? (
                    <Check className="w-3 h-3 text-success" />
                  ) : (
                    <X className="w-3 h-3 text-destructive" />
                  )}{" "}
                  Upper &amp; lowercase
                </div>
                <div className="flex items-center gap-1">
                  {checks.number ? (
                    <Check className="w-3 h-3 text-success" />
                  ) : (
                    <X className="w-3 h-3 text-destructive" />
                  )}{" "}
                  1+ number
                </div>
                <div className="flex items-center gap-1">
                  {checks.special ? (
                    <Check className="w-3 h-3 text-success" />
                  ) : (
                    <X className="w-3 h-3 text-destructive" />
                  )}{" "}
                  1+ special
                </div>
              </div>
            </div>
          )}
        </div>

        {apiError && (
          <div className="p-2 mt-0.5 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2">
            <Flame className="w-4 h-4 shrink-0" /> {apiError}
          </div>
        )}

        <Button
          type="submit"
          disabled={
            isSubmitting || (currentPassword.length > 0 && strengthScore < 4)
          }
          className="w-full h-[clamp(2.25rem,4dvh,2.5rem)] mt-0.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm transition-all duration-300 disabled:opacity-50 cursor-pointer"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            "Create Account"
          )}
        </Button>
      </form>

      <div className="relative my-[clamp(0.75rem,2dvh,1.25rem)]">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-[9px] font-bold uppercase tracking-wider">
          <span className="bg-card px-2.5 text-muted-foreground rounded-full">
            Or continue with
          </span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={() => signupWithGoogle()}
        disabled={isGoogleLoading || isSubmitting}
        className="w-full h-[clamp(2.25rem,4dvh,2.5rem)] bg-secondary/70 text-foreground hover:bg-accent border-border font-bold text-sm cursor-pointer"
      >
        {isGoogleLoading ? (
          <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
        ) : (
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
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
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
        )}
        Sign up with Google
      </Button>

      <div className="flex items-center justify-between text-[clamp(0.7rem,1.5dvh,0.82rem)] text-muted-foreground mt-[clamp(0.75rem,2dvh,1.25rem)]">
        <span>
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-primary hover:text-primary/80 font-bold transition-colors"
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

export default function RegisterPage() {
  return (
    <div className="flex h-[100dvh] w-full bg-background overflow-hidden selection:bg-primary selection:text-primary-foreground">
      <div className="absolute inset-0 lg:relative lg:w-1/2 h-full z-0 pointer-events-none bg-cinema">
        <div className="absolute inset-0 bg-background/60 lg:bg-gradient-to-t lg:from-cinema lg:via-cinema/30 lg:to-transparent z-10 backdrop-blur-sm lg:backdrop-blur-none" />
        <img
          src="/assets/hero/makizenin.avif"
          alt="Registration Background"
          className="object-cover w-full h-full opacity-60 lg:opacity-80 scale-105"
        />
        <div className="hidden lg:block absolute bottom-[clamp(2rem,6dvh,3rem)] left-12 z-20 max-w-lg">
          <h2 className="text-[clamp(2rem,5dvh,2.25rem)] font-black text-cinema-foreground tracking-tighter mb-[clamp(0.5rem,2dvh,1rem)] leading-none">
            JOIN THE VOID.
          </h2>
          <p className="text-cinema-foreground/75 text-[clamp(1rem,2dvh,1.125rem)] font-medium leading-relaxed">
            Create your account to unlock exclusive ticket drops, track your
            anime watchlist, and connect with the community.
          </p>
        </div>
      </div>

      <div className="relative z-10 w-full lg:w-1/2 h-full flex flex-col items-center overflow-y-auto no-scrollbar p-4 lg:p-8 bg-background/80 lg:bg-background">
        <div className="w-full max-w-md my-auto animate-in fade-in slide-in-from-bottom-4 duration-700 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 mb-[clamp(0.75rem,2dvh,1.5rem)] w-fit hover:opacity-80 transition-opacity mx-auto lg:mx-0"
          >
            <span className="flex size-[clamp(2rem,4dvh,2.5rem)] items-center justify-center rounded-xl border border-primary/30 bg-primary/10 backdrop-blur-md">
              <Flame className="size-4 sm:size-5 text-primary" />
            </span>
            <span className="text-[clamp(1rem,2.5dvh,1.25rem)] font-black tracking-tight">
              ANI<span className="text-primary">MANGA</span>
            </span>
          </Link>

          <Card className="bg-card/90 border-border backdrop-blur-2xl shadow-2xl p-[clamp(1rem,2.5dvh,1.5rem)]">
            <CardHeader className="p-0 pb-[clamp(0.5rem,1.5dvh,1.25rem)]">
              <CardTitle className="text-[clamp(1.125rem,2.5dvh,1.5rem)] font-black tracking-tight text-card-foreground">
                Create Account
              </CardTitle>
              <CardDescription className="text-[clamp(0.7rem,1.5dvh,0.875rem)] text-muted-foreground">
                Register to secure your identity on the platform.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Suspense
                fallback={
                  <div className="flex justify-center py-8">
                    <Loader2 className="animate-spin text-primary" />
                  </div>
                }
              >
                <RegisterFormContent />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
