// C:\Projects\animanga-platform\apps\web\src\app\(auth)\login\page.tsx
"use client";

import { useState, Suspense } from "react";
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
  MailWarning,
  ArrowRight,
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

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .max(255, "Email is too long"),
  password: z
    .string()
    .min(1, "Password is required")
    .max(100, "Password is too long"),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface ApiLoginResponse {
  success?: boolean;
  message?: string;
  data?: {
    id: string;
    email: string;
    username: string;
    roles: string[];
    permissions: string[];
  };
  error?: {
    code?: number | string;
    message?: string;
    verificationContextToken?: string;
    errors?: Array<{ message: string }>;
  };
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

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { updateUser } = useAuth();
  const callbackUrl = searchParams.get("callbackUrl") || "/tickets";

  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isUnverified, setIsUnverified] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
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

      const resData = await safeParseJson<ApiLoginResponse>(res);

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

      const payload =
        (
          resData as unknown as {
            data?: { data?: ApiLoginResponse["data"] };
          }
        )?.data?.data || resData?.data;

      if (payload) {
        updateUser({
          id: payload.id,
          email: payload.email,
          roles: payload.roles || [],
          permissions: payload.permissions || [],
        });
      }

      setIsSuccess(true);
      router.push(callbackUrl);
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setApiError(message);
    }
  };

  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsGoogleLoading(true);
      setApiError(null);
      setIsUnverified(false);

      try {
        const res = await fetch("/api/v1/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            accessToken: tokenResponse.access_token,
          }),
        });

        const resData = await safeParseJson<ApiLoginResponse>(res);

        if (!res.ok) {
          throw new Error(
            resData?.error?.message ||
              (res.status >= 500
                ? "Connection to authentication server timed out. Please try again."
                : "Google authentication failed."),
          );
        }

        const payload =
          (
            resData as unknown as {
              data?: { data?: ApiLoginResponse["data"] };
            }
          )?.data?.data || resData?.data;

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
        const message =
          err instanceof Error ? err.message : "Google login failed.";
        setApiError(message);
      } finally {
        setIsGoogleLoading(false);
      }
    },
    onError: () => {
      setApiError("Google Login was cancelled or failed.");
    },
  });

  return (
    <div className="w-full max-w-md my-auto animate-in fade-in slide-from-bottom-4 duration-700 py-4">
      <Link
        href="/"
        className="flex items-center gap-2 mb-[clamp(1rem,3dvh,2rem)] w-fit hover:opacity-80 transition-opacity mx-auto lg:mx-0"
      >
        <span className="flex size-[clamp(2rem,5dvh,2.5rem)] items-center justify-center rounded-xl border border-primary/30 bg-primary/10 backdrop-blur-md">
          <Flame className="size-4 sm:size-5 text-primary" />
        </span>
        <span className="text-[clamp(1.125rem,2.5dvh,1.25rem)] font-black tracking-tight">
          ANI<span className="text-primary">MANGA</span>
        </span>
      </Link>

      <Card className="bg-card/90 border-border backdrop-blur-2xl shadow-2xl p-[clamp(1rem,4dvh,2rem)]">
        <CardHeader className="p-0 pb-[clamp(0.75rem,2dvh,1.5rem)]">
          <CardTitle className="text-[clamp(1.25rem,3dvh,1.5rem)] font-black tracking-tight text-card-foreground">
            Welcome back.
          </CardTitle>
          <CardDescription className="text-[clamp(0.75rem,1.5dvh,0.875rem)] text-muted-foreground">
            Sign in to access your dashboard and ticket wallet.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-[clamp(0.75rem,2dvh,1.25rem)]"
          >
            <div className="space-y-[clamp(0.25rem,1dvh,0.375rem)]">
              <label className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Email
              </label>
              <Input
                type="email"
                {...register("email")}
                placeholder="goku@capsulecorp.com"
                className="h-[clamp(2.5rem,5dvh,2.75rem)] bg-background/70 border-border focus-visible:ring-primary text-sm"
              />
              {errors.email && (
                <p className="text-xs text-destructive mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-[clamp(0.25rem,1dvh,0.375rem)]">
              <div className="flex justify-between items-center">
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
                  className="h-[clamp(2.5rem,5dvh,2.75rem)] bg-background/70 border-border focus-visible:ring-primary pr-10 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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
                <p className="text-xs text-destructive mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            {isUnverified ? (
              <div className="p-3.5 mt-1 text-xs sm:text-sm text-warning bg-warning/10 border border-warning/30 rounded-xl flex flex-col gap-2">
                <div className="flex items-center gap-2 font-bold">
                  <MailWarning className="w-4 h-4 shrink-0" /> Account Not
                  Verified
                </div>
                <p className="text-foreground/85 text-xs leading-relaxed">
                  Please check your inbox for the activation link we sent when
                  you registered. If you don&apos;t see it, check your{" "}
                  <strong className="text-foreground">
                    Spam or Promotions
                  </strong>{" "}
                  folder.
                </p>
                <Link
                  href="/register?status=check"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline w-fit pt-0.5"
                >
                  <span>Check registration status &amp; resend link</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              apiError && (
                <div className="p-2.5 mt-1 text-xs sm:text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2">
                  <Flame className="w-4 h-4 shrink-0" /> {apiError}
                </div>
              )
            )}

            <Button
              type="submit"
              disabled={isSubmitting || isSuccess}
              className={cn(
                "w-full h-[clamp(2.5rem,5dvh,2.75rem)] mt-1 font-bold text-sm sm:text-base transition-all duration-300 cursor-pointer",
                isSuccess
                  ? "bg-success hover:bg-success/90 text-success-foreground"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground",
              )}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
              ) : isSuccess ? (
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4 sm:w-5 sm:h-5" /> Link Established
                </span>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="relative my-[clamp(1rem,3dvh,1.5rem)]">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
              <span className="bg-card px-2.5 text-muted-foreground rounded-full">
                Or continue with
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => loginWithGoogle()}
            disabled={isGoogleLoading || isSubmitting || isSuccess}
            className="w-full h-[clamp(2.5rem,5dvh,2.75rem)] bg-secondary/70 text-foreground hover:bg-accent border-border font-bold text-sm cursor-pointer"
          >
            {isGoogleLoading ? (
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
            ) : (
              <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" viewBox="0 0 24 24">
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
            Sign in with Google
          </Button>

          <p className="text-[clamp(0.75rem,1.5dvh,0.875rem)] text-center text-muted-foreground mt-[clamp(1rem,3dvh,1.5rem)]">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-primary hover:text-primary/80 font-bold transition-colors"
            >
              Register here
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="relative flex h-[100dvh] w-full max-w-full bg-background overflow-hidden selection:bg-primary selection:text-primary-foreground">
      <div className="absolute inset-0 lg:relative lg:w-1/2 h-full z-0 pointer-events-none bg-cinema overflow-hidden">
        <div className="absolute inset-0 bg-background/60 lg:bg-gradient-to-t lg:from-cinema lg:via-cinema/30 lg:to-transparent z-10 backdrop-blur-sm lg:backdrop-blur-none" />
        <img
          src="/assets/hero/juju.avif"
          alt="Login Background"
          className="object-cover w-full h-full opacity-60 lg:opacity-80 scale-105"
        />
        <div className="hidden lg:block absolute bottom-[clamp(2rem,6dvh,3rem)] left-12 z-20 max-w-lg">
          <h2 className="text-[clamp(2rem,5dvh,2.25rem)] font-black text-cinema-foreground tracking-tighter mb-[clamp(0.5rem,2dvh,1rem)] leading-none">
            YOUR GATEWAY TO THE CULTURE.
          </h2>
          <p className="text-cinema-foreground/75 text-[clamp(1rem,2dvh,1.125rem)] font-medium leading-relaxed">
            Manage your digital tickets, track upcoming conventions, and secure
            limited edition merchandise drops.
          </p>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-full lg:w-1/2 h-full flex flex-col items-center overflow-y-auto overflow-x-hidden no-scrollbar p-4 lg:p-8 bg-background/80 lg:bg-background">
        <Suspense
          fallback={<Loader2 className="w-8 h-8 animate-spin text-primary" />}
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
