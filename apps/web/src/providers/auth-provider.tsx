"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";

// We re-declare the user interface here to avoid importing `session.ts`
// into a Client Component, which would trigger a Next.js server-only build error.
export interface AuthUser {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
  updateUser: (user: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
  initialUser: AuthUser | null;
}

export function AuthProvider({ children, initialUser }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  /**
   * Securely logs the user out by invoking the NestJS backend to destroy
   * the HttpOnly cookie, then forcefully refreshes the Next.js Router cache.
   */
  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      // Calls your NestJS logout endpoint via the middleware proxy
      await fetch("/api/v1/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Failed to execute secure logout:", error);
    } finally {
      setUser(null);
      setIsLoading(false);
      router.push("/login");
      // Force Next.js Server Components to re-evaluate the missing session
      router.refresh();
    }
  }, [router]);

  /**
   * Used immediately after a successful login API call to hydrate
   * the client state without needing a full page reload.
   */
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Custom hook to consume the auth context securely.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return context;
}
