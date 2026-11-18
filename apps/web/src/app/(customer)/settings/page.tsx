// C:\Projects\animanga-platform\apps\web\src\app\(customer)\settings\page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import {
  User,
  Shield,
  BadgeCheck,
  Check,
  Loader2,
  Laptop,
  LogOut,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/providers/auth-provider";
import {
  unwrapApiData,
  type ActiveSessionDto,
  type KycStatusDto,
} from "@/lib/api/types/library";
import { cn } from "@/lib/utils";

type SettingsTab = "PROFILE" | "SECURITY" | "KYC";

export default function AccountSettingsPage() {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>("PROFILE");

  // Profile form state
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Security & Sessions state
  const [sessions, setSessions] = useState<ActiveSessionDto[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isRevokingOthers, setIsRevokingOthers] = useState(false);
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);
  const [securityMessage, setSecurityMessage] = useState<string | null>(null);
  const [securityError, setSecurityError] = useState<string | null>(null);

  // Organizer KYC state
  const [kycStatus, setKycStatus] = useState<KycStatusDto | null>(null);
  const [legalName, setLegalName] = useState("");
  const [kraPin, setKraPin] = useState("");
  const [isSubmittingKyc, setIsSubmittingKyc] = useState(false);
  const [kycMessage, setKycMessage] = useState<string | null>(null);
  const [kycError, setKycError] = useState<string | null>(null);

  useEffect(() => {
    setFirstName(user?.firstName || "");
    setLastName(user?.lastName || "");
    setPhone(user?.phone || "");
  }, [user?.firstName, user?.lastName, user?.phone]);

  const loadSecurityAndKyc = useCallback(async () => {
    setIsLoadingSessions(true);
    try {
      const [sessRes, kycRes] = await Promise.allSettled([
        fetch("/api/v1/users/me/sessions", { credentials: "include" }),
        fetch("/api/v1/users/me/kyc", { credentials: "include" }),
      ]);

      if (sessRes.status === "fulfilled" && sessRes.value.ok) {
        const json = await sessRes.value.json();
        const data = unwrapApiData<ActiveSessionDto[]>(json);
        if (Array.isArray(data)) setSessions(data);
      }

      if (kycRes.status === "fulfilled" && kycRes.value.ok) {
        const json = await kycRes.value.json();
        const data = unwrapApiData<KycStatusDto>(json);
        if (data) {
          setKycStatus(data);
          if (data.legalName) setLegalName(data.legalName);
        }
      }
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    void loadSecurityAndKyc();
  }, [loadSecurityAndKyc]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileMessage(null);
    setProfileError(null);

    try {
      const res = await fetch("/api/v1/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          phone: phone.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message || "Failed to update profile");
      }

      await refreshUser();
      setProfileMessage("Profile updated successfully.");
    } catch (err: unknown) {
      setProfileError(
        err instanceof Error ? err.message : "Failed to update profile.",
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleRevokeOtherSessions = async () => {
    setIsRevokingOthers(true);
    setSecurityMessage(null);
    setSecurityError(null);

    try {
      const res = await fetch("/api/v1/users/me/sessions/others", {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setSecurityMessage(
          "All other active device sessions have been revoked.",
        );
        await loadSecurityAndKyc();
      }
    } catch {
      setSecurityError("Failed to revoke other sessions.");
    } finally {
      setIsRevokingOthers(false);
    }
  };

  const linkGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsLinkingGoogle(true);
      setSecurityMessage(null);
      setSecurityError(null);

      try {
        const res = await fetch("/api/v1/users/me/link/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            accessToken: tokenResponse.access_token,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(
            json?.error?.message || "Could not link Google account.",
          );
        }
        await refreshUser();
        setSecurityMessage("Google account linked to your profile.");
      } catch (err: unknown) {
        setSecurityError(
          err instanceof Error ? err.message : "Failed to link Google account.",
        );
      } finally {
        setIsLinkingGoogle(false);
      }
    },
    onError: () => {
      setSecurityError("Google account linking was cancelled.");
    },
  });

  const handleSubmitKyc = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingKyc(true);
    setKycMessage(null);
    setKycError(null);

    try {
      const res = await fetch("/api/v1/users/me/kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          legalName: legalName.trim(),
          kraPin: kraPin.trim() ? kraPin.trim().toUpperCase() : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          json?.error?.message ||
            "KYC submission failed. Ensure KRA PIN is exactly 11 characters if provided.",
        );
      }
      await loadSecurityAndKyc();
      setKycMessage(
        "Organizer KYC profile submitted for review. You will be notified once verified.",
      );
      setKraPin("");
    } catch (err: unknown) {
      setKycError(
        err instanceof Error ? err.message : "Failed to submit KYC profile.",
      );
    } finally {
      setIsSubmittingKyc(false);
    }
  };

  const isGoogleLinked = user?.linkedProviders?.includes("GOOGLE");

  return (
    <div className="flex flex-col gap-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight uppercase text-foreground">
            Account Settings
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-1">
            Manage your personal profile, connected sign-in providers, active
            sessions, and event organizer KYC.
          </p>
        </div>

        <div className="inline-flex p-1 rounded-xl bg-secondary border border-border self-start sm:self-auto">
          {(
            [
              { id: "PROFILE", label: "Profile", icon: User },
              { id: "SECURITY", label: "Security & Sessions", icon: Shield },
              { id: "KYC", label: "Organizer KYC", icon: BadgeCheck },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                activeTab === id
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: PROFILE */}
      {activeTab === "PROFILE" && (
        <form
          onSubmit={(e) => void handleSaveProfile(e)}
          className="p-6 md:p-8 rounded-2xl bg-card border border-border shadow-xs space-y-5 max-w-2xl"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Username Handle
              </label>
              <Input
                value={`@${user?.username || ""}`}
                disabled
                className="h-10 bg-secondary/50 border-border text-sm font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Verified Email
              </label>
              <Input
                value={user?.email || ""}
                disabled
                className="h-10 bg-secondary/50 border-border text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                First Name
              </label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                className="h-10 bg-background border-border text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Last Name
              </label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                className="h-10 bg-background border-border text-sm"
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Phone Number (For M-Pesa Express Checkout)
              </label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="254712345678"
                className="h-10 bg-background border-border text-sm"
              />
            </div>
          </div>

          {profileMessage && (
            <div className="p-3 rounded-xl bg-success/15 border border-success/30 text-success text-xs font-bold flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{profileMessage}</span>
            </div>
          )}

          {profileError && (
            <div className="p-3 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{profileError}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={isSavingProfile}
            className="h-10 px-6 rounded-xl font-bold text-xs cursor-pointer"
          >
            {isSavingProfile ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Save Profile Changes"
            )}
          </Button>
        </form>
      )}

      {/* TAB 2: SECURITY & SESSIONS */}
      {activeTab === "SECURITY" && (
        <div className="space-y-6 max-w-3xl">
          {/* Connected Identity Providers */}
          <section className="p-6 rounded-2xl bg-card border border-border shadow-xs space-y-4">
            <h2 className="text-base font-black uppercase tracking-tight text-foreground">
              Connected Sign-In Providers
            </h2>

            <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 border border-border">
              <div>
                <p className="text-sm font-bold text-foreground">
                  Google OAuth 2.0
                </p>
                <p className="text-xs text-muted-foreground">
                  {isGoogleLinked
                    ? "Your Google account is cryptographically linked for one-click sign-in."
                    : "Link your Google account to sign in with one click."}
                </p>
              </div>

              {isGoogleLinked ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success/15 text-success text-xs font-bold border border-success/30">
                  <Check className="w-3.5 h-3.5" />
                  Linked
                </span>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isLinkingGoogle}
                  onClick={() => linkGoogle()}
                  className="h-9 px-4 rounded-xl text-xs font-bold cursor-pointer"
                >
                  {isLinkingGoogle ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    "Link Google Account"
                  )}
                </Button>
              )}
            </div>

            {securityMessage && (
              <div className="p-3 rounded-xl bg-success/15 border border-success/30 text-success text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>{securityMessage}</span>
              </div>
            )}

            {securityError && (
              <div className="p-3 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{securityError}</span>
              </div>
            )}
          </section>

          {/* Active Sessions */}
          <section className="p-6 rounded-2xl bg-card border border-border shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-black uppercase tracking-tight text-foreground">
                  Active Device Sessions
                </h2>
                <p className="text-xs text-muted-foreground">
                  Devices currently authenticated with your Animanga account.
                </p>
              </div>

              {sessions.length > 1 && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={isRevokingOthers}
                  onClick={() => void handleRevokeOtherSessions()}
                  className="h-8 px-3.5 rounded-xl text-xs font-bold gap-1.5 cursor-pointer self-start sm:self-auto"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Revoke All Other Devices</span>
                </Button>
              )}
            </div>

            {isLoadingSessions ? (
              <div className="py-6 flex justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-2.5">
                {sessions.map((sess) => (
                  <div
                    key={sess.id}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-secondary/50 border border-border text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Laptop className="w-4 h-4 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="font-bold text-foreground truncate max-w-md">
                          {sess.userAgent}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          IP: {sess.ipAddress} • Created{" "}
                          {new Date(sess.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {sess.isCurrent && (
                      <span className="px-2.5 py-0.5 rounded-full bg-success/15 text-success text-[10px] font-black uppercase border border-success/30 shrink-0">
                        Current Device
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* TAB 3: ORGANIZER KYC */}
      {activeTab === "KYC" && (
        <form
          onSubmit={(e) => void handleSubmitKyc(e)}
          className="p-6 md:p-8 rounded-2xl bg-card border border-border shadow-xs space-y-5 max-w-2xl"
        >
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h2 className="text-base font-black uppercase tracking-tight text-foreground">
                Merchant &amp; Event Organizer KYC
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Required to host paid conventions and receive M-Pesa
                settlements.
              </p>
            </div>

            <span
              className={cn(
                "px-3 py-1 rounded-full text-[11px] font-black uppercase border",
                kycStatus?.verificationStatus === "VERIFIED"
                  ? "bg-success/15 text-success border-success/30"
                  : "bg-warning/15 text-warning border-warning/30",
              )}
            >
              {kycStatus?.verificationStatus || "UNVERIFIED"}
            </span>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Registered Legal / Business Name
              </label>
              <Input
                required
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="e.g., Otaku Nairobi Conventions Ltd"
                className="h-10 bg-background border-border text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                KRA PIN (11 Characters, Hashed Cryptographically)
              </label>
              <Input
                value={kraPin}
                maxLength={11}
                onChange={(e) => setKraPin(e.target.value)}
                placeholder="A012345678Z"
                className="h-10 bg-background border-border text-sm uppercase font-mono"
              />
            </div>
          </div>

          {kycMessage && (
            <div className="p-3 rounded-xl bg-success/15 border border-success/30 text-success text-xs font-bold flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{kycMessage}</span>
            </div>
          )}

          {kycError && (
            <div className="p-3 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{kycError}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={isSubmittingKyc || !legalName.trim()}
            className="h-10 px-6 rounded-xl font-bold text-xs cursor-pointer"
          >
            {isSubmittingKyc ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : kycStatus?.submitted ? (
              "Update KYC Submission"
            ) : (
              "Submit Organizer KYC"
            )}
          </Button>
        </form>
      )}
    </div>
  );
}
