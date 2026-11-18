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
import { useRouter } from "next/navigation";

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

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
  updateUser: (user: AuthUser | null) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
  initialUser: AuthUser | null;
}

const VALID_SYNC_STATUSES = new Set([
  "CURRENT",
  "PLANNING",
  "COMPLETED",
  "PAUSED",
  "DROPPED",
]);

export function AuthProvider({ children, initialUser }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Sync server-rendered initialUser when Next.js router refreshes
  useEffect(() => {
    setUser(initialUser);
  }, [initialUser]);

  // Automatically sync any guest localStorage bookmarks to PostgreSQL upon login
  useEffect(() => {
    if (!user?.id) return;

    const syncLocalBookmarks = async () => {
      try {
        const entriesToSync: Array<{ mediaId: string; status: string }> = [];
        const keysToRemove: string[] = [];

        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("animanga:list:")) {
            const mediaId = key.replace("animanga:list:", "").trim();
            const val = localStorage.getItem(key);
            if (mediaId && val && VALID_SYNC_STATUSES.has(val)) {
              entriesToSync.push({ mediaId, status: val });
              keysToRemove.push(key);
            }
          }
        }

        if (entriesToSync.length === 0) return;

        const res = await fetch("/api/v1/library/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ entries: entriesToSync }),
        });

        if (res.ok) {
          keysToRemove.forEach((k) => localStorage.removeItem(k));
        }
      } catch {
        // Ignore background sync failures
      }
    };

    void syncLocalBookmarks();
  }, [user?.id]);

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
      setIsLoading(false);
      router.push("/login");
      router.refresh();
    }
  }, [router]);

  const updateUser = useCallback((newUser: AuthUser | null) => {
    setUser(newUser);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        logout,
        updateUser,
        refreshUser,
      }}
    >
      {children}
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
