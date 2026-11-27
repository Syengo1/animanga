// C:\Projects\animanga-platform\apps\web\src\providers\auth-provider.tsx
"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Heart,
  Bookmark,
  Star,
  PlusCircle,
  X,
  Sparkles,
  LogIn,
  UserPlus,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  unwrapApiData,
  type UserLibraryResponseDto,
  type UserMediaStatus,
} from "@/lib/api/types/library";
import { cn } from "@/lib/utils";

export interface AuthUser {
  id: string;
  email: string;
  username?: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  status?: string;
  emailVerifiedAt?: string | null;
  createdAt?: string;
  hasPassword?: boolean;
  linkedProviders?: string[];
  roles: string[];
  permissions: string[];
}

export type AuthGateAction = "favorite" | "bookmark" | "rate" | "progress";

export interface QuickLibrarySummary {
  status: UserMediaStatus | null;
  isFavorite: boolean;
  progress: number;
  score: number | null;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  libraryMap: Record<string, QuickLibrarySummary>;
  logout: () => Promise<void>;
  updateUser: (user: AuthUser | null) => void;
  refreshUser: () => Promise<void>;
  refreshLibraryMap: () => Promise<void>;
  setLocalLibraryItem: (
    mediaId: string,
    summary: Partial<QuickLibrarySummary> | null,
  ) => void;
  requireAuth: (action: AuthGateAction, targetTitle?: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
  initialUser: AuthUser | null;
}

const EMPTY_LIBRARY_MAP: Record<string, QuickLibrarySummary> = {};

const GATE_COPY: Record<
  AuthGateAction,
  {
    badge: string;
    heading: string;
    verb: string;
    icon: typeof Heart;
    iconColor: string;
  }
> = {
  favorite: {
    badge: "Members-Only Feature",
    heading: "Sign in to Favorite Titles",
    verb: "like and add to your Favorites",
    icon: Heart,
    iconColor: "text-destructive",
  },
  bookmark: {
    badge: "Personal Watchlist & Library",
    heading: "Sign in to Save to Your List",
    verb: "bookmark and track in your personal library",
    icon: Bookmark,
    iconColor: "text-primary",
  },
  rate: {
    badge: "Community Ratings & Reviews",
    heading: "Sign in to Rate Episodes & Titles",
    verb: "score episodes and build your affinity profile",
    icon: Star,
    iconColor: "text-warning",
  },
  progress: {
    badge: "Episode & Chapter Tracker",
    heading: "Sign in to Track Your Progress",
    verb: "log watched episodes and read chapters across devices",
    icon: PlusCircle,
    iconColor: "text-success",
  },
};

function buildLibrarySummaryMap(
  data: UserLibraryResponseDto,
): Record<string, QuickLibrarySummary> {
  const nextMap: Record<string, QuickLibrarySummary> = {};
  for (const entry of data.entries) {
    nextMap[entry.mediaId] = {
      status: entry.status,
      isFavorite: Boolean(entry.isFavorite),
      progress: entry.progress || 0,
      score: entry.score,
    };
  }
  return nextMap;
}

export function AuthProvider({ children, initialUser }: AuthProviderProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [prevInitialUser, setPrevInitialUser] = useState<AuthUser | null>(
    initialUser,
  );
  if (prevInitialUser !== initialUser) {
    setPrevInitialUser(initialUser);
    setUser(initialUser);
  }

  const [isLoading, setIsLoading] = useState(false);
  const [libraryMap, setLibraryMap] =
    useState<Record<string, QuickLibrarySummary>>(EMPTY_LIBRARY_MAP);
  const [authModal, setAuthModal] = useState<{
    isOpen: boolean;
    action: AuthGateAction;
    targetTitle?: string;
    openedAtPath: string | null;
  }>({
    isOpen: false,
    action: "bookmark",
    openedAtPath: null,
  });

  // Automatically hides the modal when the user navigates to a new route without a setState effect
  const isModalVisible =
    authModal.isOpen && authModal.openedAtPath === pathname;

  useEffect(() => {
    if (!isModalVisible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAuthModal((prev) => ({ ...prev, isOpen: false }));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalVisible]);

  const refreshLibraryMap = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch("/api/v1/library", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) return;
      const json = await res.json();
      const data = unwrapApiData<UserLibraryResponseDto>(json);
      if (data?.entries) {
        setLibraryMap(buildLibrarySummaryMap(data));
      }
    } catch {
      // Ignore background fetch error
    }
  }, [user?.id]);

  // Hydrate libraryMap asynchronously when authenticated; purge stale guest localStorage when logged out
  useEffect(() => {
    if (user?.id) {
      const controller = new AbortController();
      void fetch("/api/v1/library", {
        credentials: "include",
        cache: "no-store",
        signal: controller.signal,
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((json: unknown) => {
          if (!json) return;
          const data = unwrapApiData<UserLibraryResponseDto>(json);
          if (data?.entries) {
            setLibraryMap(buildLibrarySummaryMap(data));
          }
        })
        .catch(() => {
          // Ignore aborted or failed background fetches
        });

      return () => controller.abort();
    }

    try {
      const keysToDelete: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (
          k &&
          (k.startsWith("animanga:list:") || k.startsWith("animanga:fav:"))
        ) {
          keysToDelete.push(k);
        }
      }
      keysToDelete.forEach((k) => localStorage.removeItem(k));
    } catch {
      // Ignore storage error
    }
  }, [user?.id]);

  const setLocalLibraryItem = useCallback(
    (mediaId: string, summary: Partial<QuickLibrarySummary> | null) => {
      setLibraryMap((prev) => {
        const next = { ...prev };
        if (summary === null) {
          delete next[mediaId];
          return next;
        }
        const current = next[mediaId] || {
          status: null,
          isFavorite: false,
          progress: 0,
          score: null,
        };
        const updated: QuickLibrarySummary = {
          ...current,
          ...summary,
        };
        if (
          !updated.status &&
          !updated.isFavorite &&
          updated.progress === 0 &&
          !updated.score
        ) {
          delete next[mediaId];
        } else {
          next[mediaId] = updated;
        }
        return next;
      });
    },
    [],
  );

  const requireAuth = useCallback(
    (action: AuthGateAction, targetTitle?: string): boolean => {
      if (user?.id) return true;
      setAuthModal({
        isOpen: true,
        action,
        targetTitle,
        openedAtPath: pathname,
      });
      return false;
    },
    [user?.id, pathname],
  );

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/users/me", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) return;
      const json = await res.json();
      const data = json?.data || json;
      if (data?.id) {
        setUser({
          id: data.id,
          email: data.email || "",
          username: data.username || data.email?.split("@")[0],
          firstName: data.firstName ?? null,
          lastName: data.lastName ?? null,
          phone: data.phone ?? null,
          status: data.status,
          emailVerifiedAt: data.emailVerifiedAt ?? null,
          createdAt: data.createdAt,
          hasPassword: Boolean(data.hasPassword),
          linkedProviders: data.linkedProviders || [],
          roles: data.roles || [],
          permissions: data.permissions || [],
        });
      }
    } catch {
      // Ignore refresh error
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await fetch("/api/v1/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
    } catch (error) {
      console.error("Failed to execute secure logout:", error);
    } finally {
      setUser(null);
      setLibraryMap(EMPTY_LIBRARY_MAP);
      setIsLoading(false);
      router.push("/login");
      router.refresh();
    }
  }, [router]);

  const updateUser = useCallback((newUser: AuthUser | null) => {
    setUser(newUser);
  }, []);

  const activeCopy = GATE_COPY[authModal.action];
  const ModalIcon = activeCopy.icon;
  const callbackQuery = pathname
    ? `?callbackUrl=${encodeURIComponent(pathname)}`
    : "";

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        libraryMap: user?.id ? libraryMap : EMPTY_LIBRARY_MAP,
        logout,
        updateUser,
        refreshUser,
        refreshLibraryMap,
        setLocalLibraryItem,
        requireAuth,
      }}
    >
      {children}

      {/* Global Context-Aware Authentication Prompt Modal */}
      {isModalVisible && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-gate-modal-title"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-cinema/75 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setAuthModal((prev) => ({ ...prev, isOpen: false }))}
        >
          <div
            className="relative w-full max-w-md rounded-3xl bg-card border border-border p-6 sm:p-7 shadow-2xl text-center flex flex-col items-center gap-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close modal"
              onClick={() =>
                setAuthModal((prev) => ({ ...prev, isOpen: false }))
              }
              className="absolute top-4 right-4 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="size-14 rounded-2xl bg-secondary border border-border flex items-center justify-center shadow-xs">
              <ModalIcon className={cn("w-7 h-7", activeCopy.iconColor)} />
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 text-primary text-[11px] font-black uppercase tracking-wider">
              <Sparkles className="w-3 h-3" />
              {activeCopy.badge}
            </span>

            <div className="space-y-1.5">
              <h3
                id="auth-gate-modal-title"
                className="text-xl sm:text-2xl font-black tracking-tight text-foreground"
              >
                {activeCopy.heading}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                You need a registered Animanga account to{" "}
                <span className="font-bold text-foreground">
                  {activeCopy.verb}
                </span>
                {authModal.targetTitle ? (
                  <>
                    {" "}
                    for{" "}
                    <span className="font-bold text-primary">
                      &ldquo;{authModal.targetTitle}&rdquo;
                    </span>
                  </>
                ) : null}
                . Sign in or create a free account in seconds.
              </p>
            </div>

            <div className="w-full flex flex-col sm:flex-row gap-2.5 pt-2">
              <Link
                href={`/login${callbackQuery}`}
                onClick={() =>
                  setAuthModal((prev) => ({ ...prev, isOpen: false }))
                }
                className={cn(
                  buttonVariants({ variant: "default" }),
                  "flex-1 h-11 rounded-xl font-bold text-xs sm:text-sm gap-2 shadow-md",
                )}
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </Link>
              <Link
                href="/register"
                onClick={() =>
                  setAuthModal((prev) => ({ ...prev, isOpen: false }))
                }
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "flex-1 h-11 rounded-xl font-bold text-xs sm:text-sm gap-2 bg-secondary/60 hover:bg-accent border-border",
                )}
              >
                <UserPlus className="w-4 h-4 text-primary" />
                <span>Create Account</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return context;
}
