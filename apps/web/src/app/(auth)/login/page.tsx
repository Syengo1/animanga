"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Flame, Eye, EyeOff, Loader2, Check, MailWarning } from "lucide-react";
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
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";

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
    id: string; // <-- Added
    email: string;
    username: string;
    roles: string[]; // <-- Added
    permissions: string[]; // <-- Added
  };
  error?: {
    code?: number | string;
    message?: string;
    errors?: Array<{ message: string }>;
  };
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
  const [isGoogleLoading, setIsGoogleLoading] = useState(false); // <-- NEW

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
      // FIX: Bypass the Next.js rewrite proxy and hit the backend directly.
      // This ensures the Set-Cookie header reaches the browser intact.
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL?.replace("localhost", "127.0.0.1") ||
        "http://127.0.0.1:3001";

      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Remains critical for direct cross-port cookie setting
        body: JSON.stringify(data),
      });

      const resData = (await res.json()) as ApiLoginResponse;

      if (!res.ok) {
        const errorMessage =
          resData.error?.message ||
          resData.message ||
          "Invalid credentials. Please try again.";

        if (
          res.status === 401 &&
          errorMessage.toLowerCase().includes("verify your email")
        ) {
          setIsUnverified(true);
          throw new Error("Your account requires email verification.");
        }
        throw new Error(errorMessage);
      }

      if (resData.data) {
        updateUser({
          id: resData.data.id,
          email: resData.data.email,
          roles: resData.data.roles || [],
          permissions: resData.data.permissions || [],
        });
      }

      setIsSuccess(true);

      setTimeout(() => {
        router.push(callbackUrl);
        router.refresh();
      }, 1200);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setApiError(message);
    }
  };

  // NEW: Google Auth-Code Exchange Flow
  const loginWithGoogle = useGoogleLogin({
    flow: "auth-code",
    onSuccess: async (codeResponse) => {
      setIsGoogleLoading(true);
      setApiError(null);
      setIsUnverified(false);

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
            redirectUri: "postmessage", // Required by Google for popup flows
          }),
        });

        const resData = (await res.json()) as ApiLoginResponse;

        if (!res.ok) {
          throw new Error(
            resData.error?.message || "Google authentication failed.",
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

        setIsSuccess(true);
        setTimeout(() => {
          router.push(callbackUrl);
          router.refresh();
        }, 1200);
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
        <span className="flex size-[clamp(2rem,5dvh,2.5rem)] items-center justify-center rounded-xl border border-white/10 bg-white/5 backdrop-blur-md">
          <Flame className="size-4 sm:size-5 text-primary" />
        </span>
        <span className="text-[clamp(1.125rem,2.5dvh,1.25rem)] font-bold tracking-tight">
          Animanga
        </span>
      </Link>

      <Card className="bg-black/60 lg:bg-white/5 border-white/10 backdrop-blur-2xl shadow-2xl p-[clamp(1rem,4dvh,2rem)]">
        <CardHeader className="p-0 pb-[clamp(0.75rem,2dvh,1.5rem)]">
          <CardTitle className="text-[clamp(1.25rem,3dvh,1.5rem)] font-black tracking-tight">
            Welcome back.
          </CardTitle>
          <CardDescription className="text-[clamp(0.75rem,1.5dvh,0.875rem)] text-white/60">
            Enter the void and access your ticket wallet.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-[clamp(0.75rem,2dvh,1.25rem)]"
          >
            <div className="space-y-[clamp(0.25rem,1dvh,0.375rem)]">
              <label className="text-[10px] sm:text-[11px] font-bold text-white/70 uppercase tracking-wider">
                Email
              </label>
              <Input
                type="email"
                {...register("email")}
                placeholder="goku@capsulecorp.com"
                className="h-[clamp(2.5rem,5dvh,2.75rem)] bg-black/40 border-white/10 focus-visible:ring-primary text-sm"
              />
              {errors.email && (
                <p className="text-xs text-destructive mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-[clamp(0.25rem,1dvh,0.375rem)]">
              <div className="flex justify-between items-center">
                <label className="text-[10px] sm:text-[11px] font-bold text-white/70 uppercase tracking-wider">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[10px] sm:text-xs text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
                  placeholder="••••••••"
                  className="h-[clamp(2.5rem,5dvh,2.75rem)] bg-black/40 border-white/10 focus-visible:ring-primary pr-10 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
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
              <div className="p-3 mt-1 text-xs sm:text-sm text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex flex-col gap-2">
                <div className="flex items-center gap-2 font-bold">
                  <MailWarning className="w-4 h-4 shrink-0" /> Account Not
                  Verified
                </div>
                <p className="text-yellow-500/80">
                  Please check your inbox for the activation link we sent when
                  you registered.
                </p>
                <Link
                  href="/register"
                  className="text-left underline hover:text-yellow-400 w-fit"
                >
                  Check registration status
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
                "w-full h-[clamp(2.5rem,5dvh,2.75rem)] mt-1 font-bold text-sm sm:text-base transition-all duration-300",
                isSuccess
                  ? "bg-[#34A853] hover:bg-[#34A853] text-white"
                  : "bg-primary hover:bg-primary/90 text-white",
              )}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
              ) : isSuccess ? (
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4 sm:w-5 sm:h-5" /> Link Established
                </span>
              ) : (
                "Initialize Link"
              )}
            </Button>
          </form>

          <div className="relative my-[clamp(1rem,3dvh,1.5rem)]">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
              <span className="bg-[#100c14] lg:bg-[#151119] px-2 text-white/50 rounded-full">
                Or continue with
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => loginWithGoogle()} // <-- FIX: Use the hook
            disabled={isGoogleLoading || isSubmitting || isSuccess}
            className="w-full h-[clamp(2.5rem,5dvh,2.75rem)] bg-white text-black hover:bg-white/90 border-transparent font-bold text-sm"
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

          <p className="text-[clamp(0.75rem,1.5dvh,0.875rem)] text-center text-white/50 mt-[clamp(1rem,3dvh,1.5rem)]">
            Don't have an account?{" "}
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
    <div className="flex h-[100dvh] w-full bg-black overflow-hidden selection:bg-primary selection:text-white">
      <div className="absolute inset-0 lg:relative lg:w-1/2 h-full z-0 pointer-events-none">
        <div className="absolute inset-0 bg-black/60 lg:bg-gradient-to-t lg:from-black lg:via-black/20 lg:to-transparent z-10 backdrop-blur-sm lg:backdrop-blur-none" />
        <img
          src="/assets/hero/juju.avif"
          alt="Login Background"
          className="object-cover w-full h-full opacity-60 lg:opacity-80 scale-105"
        />
        <div className="hidden lg:block absolute bottom-[clamp(2rem,6dvh,3rem)] left-12 z-20 max-w-lg">
          <h2 className="text-[clamp(2rem,5dvh,2.25rem)] font-black text-white tracking-tighter mb-[clamp(0.5rem,2dvh,1rem)] leading-none">
            YOUR GATEWAY TO THE CULTURE.
          </h2>
          <p className="text-white/60 text-[clamp(1rem,2dvh,1.125rem)] font-medium leading-relaxed">
            Manage your digital tickets, track upcoming conventions, and secure
            limited edition merchandise drops.
          </p>
        </div>
      </div>

      <div className="relative z-10 w-full lg:w-1/2 h-full flex flex-col items-center overflow-y-auto no-scrollbar p-4 lg:p-8 lg:bg-[#100c14]">
        <Suspense
          fallback={<Loader2 className="w-8 h-8 animate-spin text-primary" />}
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
