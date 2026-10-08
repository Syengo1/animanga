"use client";

import { useState, useEffect, Suspense, useRef } from "react";
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
} from "lucide-react";
import { useGoogleLogin } from "@react-oauth/google"; // <-- NEW
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useAuth } from "@/providers/auth-provider"; // <-- NEW
import { cn } from "@/lib/utils";

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

  // NEW: Token-aware tracking and terminal success latch
  const attemptedTokenRef = useRef<string | null>(null);
  const verificationSucceededRef = useRef(false);

  // UX States based on deterministic backend codes
  type ViewState =
    | "idle"
    | "success"
    | "verifying"
    | "verified"
    | "expired"
    | "already_used"
    | "invalid"
    | "network_error"
    | "error";

  const [viewState, setViewState] = useState<ViewState>(
    tokenFromUrl ? "verifying" : "idle",
  );

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [resendEmail, setResendEmail] = useState("");

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

  // EFFECT: Deterministic API evaluation
  useEffect(() => {
    if (!tokenFromUrl) return;

    if (attemptedTokenRef.current === tokenFromUrl) {
      return;
    }

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

        const body = await response.json();

        // 1. Terminal Success (Locks out late failures)
        if (response.ok) {
          verificationSucceededRef.current = true;
          setViewState("verified");
          return;
        }

        // 2. Structured Failure Handling
        const code = body?.message?.code || body?.code;

        if (code === "VERIFICATION_TOKEN_ALREADY_USED") {
          // Only show 'already used' if we didn't just succeed moments ago
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
      } catch (error) {
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
    setResendEmail(data.email);

    const nameParts = data.name.trim().split(" ");
    const firstName = nameParts[0];
    const lastName =
      nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined;

    const backendPayload = {
      email: data.email,
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

      const resData = await res.json();

      if (!res.ok) {
        if (res.status === 409 && resData.error?.suggestions) {
          setSuggestions(resData.error.suggestions);
          throw new Error(resData.error.message || "Username is taken");
        }

        let errorMessage = "Registration failed. Please try again.";
        if (resData.error?.errors && Array.isArray(resData.error.errors)) {
          errorMessage = resData.error.errors
            .map((e: any) => e.message)
            .join(", ");
        } else {
          errorMessage =
            resData.error?.message || resData.message || errorMessage;
        }
        throw new Error(errorMessage);
      }

      setViewState("success");
    } catch (err: any) {
      setApiError(err.message);
    }
  };

  const handleResendLink = async () => {
    alert("Verification link resent! (Endpoint wiring pending)");
    setViewState("success");
  };

  // NEW: Google Auth-Code Exchange Flow
  const signupWithGoogle = useGoogleLogin({
    flow: "auth-code",
    onSuccess: async (codeResponse) => {
      setIsGoogleLoading(true);
      setApiError(null);

      try {
        const baseUrl =
          process.env.NEXT_PUBLIC_API_URL?.replace("localhost", "127.0.0.1") ||
          "http://127.0.0.1:3001";
        const res = await fetch(`${baseUrl}/api/v1/auth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include", // Mandatory for cookies
          body: JSON.stringify({
            code: codeResponse.code,
            redirectUri: "postmessage",
          }),
        });

        const resData = await res.json();

        if (!res.ok) {
          throw new Error(
            resData.error?.message || "Google registration failed.",
          );
        }

        if (resData.data) {
          updateUser({
            id: resData.data.id,
            email: resData.data.email,
            roles: resData.data.roles || [],
            permissions: resData.data.permissions || [],
          });
        }

        // Google signup returns a valid session immediately. Bypass verification screen.
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
        <p className="text-sm text-foreground/60">
          Please wait while we activate your account.
        </p>
      </div>
    );
  }

  if (viewState === "verified") {
    return (
      <div className="animate-in zoom-in duration-500 flex flex-col items-center justify-center py-8 text-center space-y-6">
        <div className="size-20 rounded-full bg-[#34A853]/20 flex items-center justify-center border border-[#34A853]/30">
          <Check className="size-10 text-[#34A853]" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-foreground mb-2">
            Account Verified!
          </h3>
          <p className="text-sm text-foreground/70">
            Welcome to Animanga. Your identity is secured and you are ready to
            enter the void.
          </p>
        </div>
        <Button
          onClick={() => router.push("/login")}
          className="w-full h-12 bg-primary hover:bg-primary/90 text-foreground font-bold text-lg"
        >
          Proceed to Login
        </Button>
      </div>
    );
  }

  if (viewState === "already_used") {
    return (
      <div className="animate-in fade-in duration-500 flex flex-col items-center justify-center py-8 text-center space-y-6">
        <div className="size-20 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
          <Check className="size-10 text-blue-500" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-foreground mb-2">
            Already Verified
          </h3>
          <p className="text-sm text-foreground/70">
            This account has already been activated. You can safely proceed to
            login.
          </p>
        </div>
        <Button
          onClick={() => router.push("/login")}
          className="w-full h-12 bg-primary hover:bg-primary/90 text-foreground font-bold text-lg"
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
          <p className="text-sm text-foreground/70">
            This verification link has expired. Please request a new one to
            activate your account.
          </p>
        </div>
        <Button
          onClick={handleResendLink}
          variant="outline"
          className="w-full h-12 border-primary text-primary hover:bg-primary/10 font-bold"
        >
          <Send className="w-4 h-4 mr-2" /> Resend Verification Link
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
          <p className="text-sm text-foreground/70">
            We couldn't recognize this verification link. Ensure you copied the
            full URL from your email.
          </p>
        </div>
        <Button
          onClick={() => router.push("/register")}
          variant="outline"
          className="w-full h-12 border-primary text-primary hover:bg-primary/10 font-bold"
        >
          Return to Registration
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
          <p className="text-sm text-foreground/70">
            We couldn't verify your email right now. Please check your
            connection and try again.
          </p>
        </div>
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          className="w-full h-12 border-primary text-primary hover:bg-primary/10 font-bold"
        >
          Retry Verification
        </Button>
      </div>
    );
  }

  if (viewState === "success") {
    return (
      <div className="animate-in zoom-in duration-500 flex flex-col items-center justify-center py-8 text-center space-y-6">
        <div className="size-16 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
          <Send className="size-8 text-blue-500" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground mb-2">
            Check your Inbox
          </h3>
          <p className="text-sm text-foreground/70">
            We've securely reserved your handle. Please click the activation
            link sent to{" "}
            <span className="text-foreground font-semibold">{resendEmail}</span>{" "}
            to complete registration.
          </p>
        </div>
        <div className="pt-4 w-full border-t border-border">
          <p className="text-xs text-foreground/50 mb-3">
            Didn't receive the email?
          </p>
          <Button
            onClick={handleResendLink}
            variant="ghost"
            className="w-full text-foreground/70 hover:text-foreground hover:bg-accent text-xs h-8"
          >
            Click here to resend
          </Button>
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
          <label className="text-[10px] sm:text-[11px] font-bold text-foreground/70 uppercase tracking-wider">
            Full Name
          </label>
          <Input
            type="text"
            {...register("name")}
            placeholder="Monkey D. Luffy"
            className="h-[clamp(2.25rem,4dvh,2.5rem)] bg-background/40 border-border focus-visible:ring-primary text-sm"
          />
          {errors.name && (
            <p className="text-[10px] text-destructive leading-tight">
              {errors.name.message}
            </p>
          )}
        </div>

        <div className="space-y-[clamp(0.15rem,0.5dvh,0.25rem)]">
          <label className="text-[10px] sm:text-[11px] font-bold text-foreground/70 uppercase tracking-wider flex justify-between">
            <span>Username</span>
            <span className="text-foreground/30 lowercase normal-case">
              (Optional)
            </span>
          </label>
          <Input
            type="text"
            {...register("username")}
            placeholder="joyboy_2026"
            className="h-[clamp(2.25rem,4dvh,2.5rem)] bg-background/40 border-border focus-visible:ring-primary text-sm"
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
                    className="text-[11px] py-1.5 px-2 bg-background/40 hover:bg-primary/20 border border-white/5 rounded text-foreground/80 transition-colors truncate"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-[clamp(0.15rem,0.5dvh,0.25rem)]">
          <label className="text-[10px] sm:text-[11px] font-bold text-foreground/70 uppercase tracking-wider">
            Email
          </label>
          <Input
            type="email"
            {...register("email")}
            placeholder="goku@capsulecorp.com"
            className="h-[clamp(2.25rem,4dvh,2.5rem)] bg-background/40 border-border focus-visible:ring-primary text-sm"
          />
          {errors.email && (
            <p className="text-[10px] text-destructive leading-tight">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-[clamp(0.15rem,0.5dvh,0.25rem)]">
          <label className="text-[10px] sm:text-[11px] font-bold text-foreground/70 uppercase tracking-wider">
            Password
          </label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              {...register("password")}
              placeholder="••••••••"
              className="h-[clamp(2.25rem,4dvh,2.5rem)] bg-background/40 border-border focus-visible:ring-primary pr-10 text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/50 hover:text-foreground transition-colors"
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
                    strengthScore >= 1 ? "bg-red-500" : "bg-white/10",
                  )}
                />
                <div
                  className={cn(
                    "h-full flex-1 transition-all duration-300",
                    strengthScore >= 2 ? "bg-orange-500" : "bg-white/10",
                  )}
                />
                <div
                  className={cn(
                    "h-full flex-1 transition-all duration-300",
                    strengthScore >= 3 ? "bg-yellow-500" : "bg-white/10",
                  )}
                />
                <div
                  className={cn(
                    "h-full flex-1 transition-all duration-300",
                    strengthScore >= 4 ? "bg-[#34A853]" : "bg-white/10",
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-y-0.5 gap-x-2 text-[9px] sm:text-[10px] text-foreground/60">
                <div className="flex items-center gap-1">
                  {checks.length ? (
                    <Check className="w-3 h-3 text-[#34A853]" />
                  ) : (
                    <X className="w-3 h-3 text-red-400" />
                  )}{" "}
                  12+ chars
                </div>
                <div className="flex items-center gap-1">
                  {checks.casing ? (
                    <Check className="w-3 h-3 text-[#34A853]" />
                  ) : (
                    <X className="w-3 h-3 text-red-400" />
                  )}{" "}
                  Upper & lowercase
                </div>
                <div className="flex items-center gap-1">
                  {checks.number ? (
                    <Check className="w-3 h-3 text-[#34A853]" />
                  ) : (
                    <X className="w-3 h-3 text-red-400" />
                  )}{" "}
                  1+ number
                </div>
                <div className="flex items-center gap-1">
                  {checks.special ? (
                    <Check className="w-3 h-3 text-[#34A853]" />
                  ) : (
                    <X className="w-3 h-3 text-red-400" />
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
          className="w-full h-[clamp(2.25rem,4dvh,2.5rem)] mt-0.5 bg-primary hover:bg-primary/90 text-foreground font-bold text-sm transition-all duration-300 disabled:opacity-50"
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
          <span className="bg-[#100c14] lg:bg-[#151119] px-2 text-foreground/50 rounded-full">
            Or continue with
          </span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={() => signupWithGoogle()} // <-- FIX: Use the hook
        disabled={isGoogleLoading || isSubmitting}
        className="w-full h-[clamp(2.25rem,4dvh,2.5rem)] bg-white text-black hover:bg-white/90 border-transparent font-bold text-sm"
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

      <p className="text-[clamp(0.7rem,1.5dvh,0.875rem)] text-center text-foreground/50 mt-[clamp(0.75rem,2dvh,1.25rem)]">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-primary hover:text-primary/80 font-bold transition-colors"
        >
          Sign in here
        </Link>
      </p>
    </>
  );
}

export default function RegisterPage() {
  return (
    <div className="flex h-[100dvh] w-full bg-background overflow-hidden selection:bg-primary selection:text-foreground">
      <div className="absolute inset-0 lg:relative lg:w-1/2 h-full z-0 pointer-events-none">
        <div className="absolute inset-0 bg-background/60 lg:bg-gradient-to-t lg:from-black lg:via-black/20 lg:to-transparent z-10 backdrop-blur-sm lg:backdrop-blur-none" />
        <img
          src="/assets/hero/makizenin.avif"
          alt="Registration Background"
          className="object-cover w-full h-full opacity-60 lg:opacity-80 scale-105"
        />
        <div className="hidden lg:block absolute bottom-[clamp(2rem,6dvh,3rem)] left-12 z-20 max-w-lg">
          <h2 className="text-[clamp(2rem,5dvh,2.25rem)] font-black text-foreground tracking-tighter mb-[clamp(0.5rem,2dvh,1rem)] leading-none">
            JOIN THE VOID.
          </h2>
          <p className="text-foreground/60 text-[clamp(1rem,2dvh,1.125rem)] font-medium leading-relaxed">
            Create your account to unlock exclusive ticket drops, track your
            anime watchlist, and connect with the community.
          </p>
        </div>
      </div>

      <div className="relative z-10 w-full lg:w-1/2 h-full flex flex-col items-center overflow-y-auto no-scrollbar p-4 lg:p-8 lg:bg-[#100c14]">
        <div className="w-full max-w-md my-auto animate-in fade-in slide-in-from-bottom-4 duration-700 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 mb-[clamp(0.75rem,2dvh,1.5rem)] w-fit hover:opacity-80 transition-opacity mx-auto lg:mx-0"
          >
            <span className="flex size-[clamp(2rem,4dvh,2.5rem)] items-center justify-center rounded-xl border border-border bg-accent backdrop-blur-md">
              <Flame className="size-4 sm:size-5 text-primary" />
            </span>
            <span className="text-[clamp(1rem,2.5dvh,1.25rem)] font-bold tracking-tight">
              Animanga
            </span>
          </Link>

          <Card className="bg-background/60 lg:bg-accent border-border backdrop-blur-2xl shadow-2xl p-[clamp(1rem,2.5dvh,1.5rem)]">
            <CardHeader className="p-0 pb-[clamp(0.5rem,1.5dvh,1.25rem)]">
              <CardTitle className="text-[clamp(1.125rem,2.5dvh,1.5rem)] font-black tracking-tight">
                Create Account
              </CardTitle>
              <CardDescription className="text-[clamp(0.7rem,1.5dvh,0.875rem)] text-foreground/60">
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
