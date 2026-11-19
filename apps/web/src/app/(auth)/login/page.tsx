// C:\Projects\animanga-platform\apps\web\src\app\(auth)\login\page.tsx
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { AuthSplitShell } from "@/features/auth/auth-split-shell";
import { LoginForm } from "@/features/auth/login-form";

export default function LoginPage() {
  return (
    <AuthSplitShell
      heroImage="/assets/hero/juju.avif"
      heroAlt="Login Background"
      heroHeading="YOUR GATEWAY TO THE CULTURE."
      heroSubheading="Track airing anime in EAT, manage your library, and secure cryptographic convention tickets."
      cardTitle="Welcome back."
      cardDescription="Sign in to open your Animanga dashboard."
    >
      <Suspense
        fallback={
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </AuthSplitShell>
  );
}
