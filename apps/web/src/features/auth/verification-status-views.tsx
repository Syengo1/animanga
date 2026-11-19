// C:\Projects\animanga-platform\apps\web\src\features\auth\verification-status-views.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Check,
  MailX,
  Send,
  AlertCircle,
  MailWarning,
  RefreshCw,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type {
  RegisterViewState,
  RegistrationStatusPayload,
} from "./auth.utils";

interface VerificationStatusViewsProps {
  viewState: Exclude<RegisterViewState, "idle">;
  resendEmail: string;
  onResendEmailChange: (value: string) => void;
  contextToken: string | null;
  statusData: RegistrationStatusPayload | null;
  isCheckingStatus: boolean;
  isResending: boolean;
  resendFeedback: string | null;
  resendCooldown: number;
  apiError: string | null;
  onRefreshStatus: () => void;
  onResendLink: (e?: React.FormEvent) => void;
  onSwitchToStatusCheck: () => void;
  onResetToRegister: () => void;
}

export function VerificationStatusViews({
  viewState,
  resendEmail,
  onResendEmailChange,
  contextToken,
  statusData,
  isCheckingStatus,
  isResending,
  resendFeedback,
  resendCooldown,
  apiError,
  onRefreshStatus,
  onResendLink,
  onSwitchToStatusCheck,
  onResetToRegister,
}: VerificationStatusViewsProps) {
  const router = useRouter();

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

  if (viewState === "verified" || viewState === "already_used") {
    const isAlready = viewState === "already_used";
    return (
      <div className="animate-in zoom-in duration-300 flex flex-col items-center justify-center py-8 text-center space-y-6">
        <div
          className={cn(
            "size-20 rounded-full flex items-center justify-center border",
            isAlready
              ? "bg-primary/20 border-primary/30 text-primary"
              : "bg-success/20 border-success/30 text-success",
          )}
        >
          <Check className="size-10" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-foreground mb-2">
            {isAlready ? "Already Verified" : "Account Verified!"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isAlready
              ? "This account has already been activated. You can sign in to your dashboard."
              : "Welcome to Animanga. Your email is verified and your account is ready."}
          </p>
        </div>
        <Button
          onClick={() => router.push("/login")}
          className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base cursor-pointer"
        >
          Sign In to Dashboard
        </Button>
      </div>
    );
  }

  if (
    viewState === "expired" ||
    viewState === "invalid" ||
    viewState === "network_error" ||
    viewState === "error"
  ) {
    const isExpired = viewState === "expired";
    const isInvalid = viewState === "invalid";
    return (
      <div className="animate-in fade-in duration-300 flex flex-col items-center justify-center py-8 text-center space-y-6">
        <div className="size-20 rounded-full bg-destructive/20 flex items-center justify-center border border-destructive/30">
          {isExpired ? (
            <MailX className="size-10 text-destructive" />
          ) : (
            <AlertCircle className="size-10 text-destructive" />
          )}
        </div>
        <div>
          <h3 className="text-2xl font-bold text-foreground mb-2">
            {isExpired
              ? "Link Expired"
              : isInvalid
                ? "Invalid Link"
                : "Connection Error"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isExpired
              ? "This verification link has expired. Request a fresh 24-hour activation link below."
              : isInvalid
                ? "We couldn't recognize this verification link. Ensure you copied the full URL from your email."
                : "We couldn't verify your email right now. Please check your connection and try again."}
          </p>
        </div>
        <Button
          onClick={
            isExpired || isInvalid
              ? onSwitchToStatusCheck
              : () => window.location.reload()
          }
          variant="outline"
          className="w-full h-11 border-primary text-primary hover:bg-primary/10 font-bold cursor-pointer"
        >
          {isExpired || isInvalid ? (
            <>
              <Send className="w-4 h-4 mr-2" /> Request Fresh Verification Link
            </>
          ) : (
            "Retry Verification"
          )}
        </Button>
      </div>
    );
  }

  // Verification Hub (shown after signup or via "Check status / Resend")
  const isVerified = statusData?.status === "ACTIVE";
  const showAuthenticatedHub = viewState === "success" || Boolean(contextToken);

  return (
    <div className="animate-in fade-in duration-300 flex flex-col space-y-5 py-2">
      {showAuthenticatedHub ? (
        isVerified ? (
          <div className="p-4 rounded-xl bg-success/10 border border-success/30 text-left space-y-3">
            <div className="flex items-center gap-2 text-success font-bold text-sm">
              <Check className="w-5 h-5 shrink-0" />
              <span>Account Verified &amp; Active</span>
            </div>
            <p className="text-xs text-foreground/85 leading-relaxed">
              Your account (
              <span className="font-bold">{statusData?.email}</span>) is
              verified and ready. Sign in to open your dashboard.
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
              {contextToken && (
                <button
                  type="button"
                  onClick={onRefreshStatus}
                  disabled={isCheckingStatus}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline cursor-pointer"
                >
                  <RefreshCw
                    className={cn(
                      "w-3 h-3",
                      isCheckingStatus && "animate-spin",
                    )}
                  />
                  <span>Refresh</span>
                </button>
              )}
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
                  Mark it as{" "}
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
              onClick={() => onResendLink()}
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
        <form onSubmit={onResendLink} className="space-y-4 text-left">
          <div className="p-3.5 rounded-xl bg-secondary/60 border border-border space-y-2">
            <div className="flex items-center gap-2 text-foreground font-bold text-xs sm:text-sm">
              <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
              <span>Resend Activation Link</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Enter your registered email address. If your account is awaiting
              verification, we&apos;ll send a fresh 24-hour activation link.
              Check your{" "}
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
              onChange={(e) => onResendEmailChange(e.target.value)}
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
            disabled={isResending || resendCooldown > 0 || !resendEmail.trim()}
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
          onClick={onResetToRegister}
          className="inline-flex items-center gap-1 font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Registration</span>
        </button>

        <Link href="/login" className="font-bold text-primary hover:underline">
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}
