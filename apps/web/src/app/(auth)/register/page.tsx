// C:\Projects\animanga-platform\apps\web\src\app\(auth)\register\page.tsx
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { AuthSplitShell } from "@/features/auth/auth-split-shell";
import { RegisterForm } from "@/features/auth/register-form";

export default function RegisterPage() {
  return (
    <AuthSplitShell
      heroImage="/assets/hero/makizenin.avif"
      heroAlt="Registration Background"
      heroHeading="JOIN THE VOID."
      heroSubheading="Create your account to unlock personalized airing radars, episode ratings, and exclusive ticket drops."
      cardTitle="Create Account"
      cardDescription="Register to secure your identity on the platform."
    >
      <Suspense
        fallback={
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        }
      >
        <RegisterForm />
      </Suspense>
    </AuthSplitShell>
  );
}
