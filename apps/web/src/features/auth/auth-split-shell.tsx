// C:\Projects\animanga-platform\apps\web\src\features\auth\auth-split-shell.tsx
import type { ReactNode } from "react";
import Link from "next/link";
import { Flame } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

interface AuthSplitShellProps {
  heroImage: string;
  heroAlt: string;
  heroHeading: string;
  heroSubheading: string;
  cardTitle: string;
  cardDescription: string;
  children: ReactNode;
}

export function AuthSplitShell({
  heroImage,
  heroAlt,
  heroHeading,
  heroSubheading,
  cardTitle,
  cardDescription,
  children,
}: AuthSplitShellProps) {
  return (
    <div className="relative flex h-[100dvh] w-full max-w-full bg-background overflow-hidden selection:bg-primary selection:text-primary-foreground">
      {/* Left Visual Backdrop (Clipped cleanly to prevent mobile horizontal scroll) */}
      <div className="absolute inset-0 lg:relative lg:w-1/2 h-full z-0 pointer-events-none bg-cinema overflow-hidden">
        <div className="absolute inset-0 bg-background/60 lg:bg-gradient-to-t lg:from-cinema lg:via-cinema/30 lg:to-transparent z-10 backdrop-blur-sm lg:backdrop-blur-none" />
        <img
          src={heroImage}
          alt={heroAlt}
          className="object-cover w-full h-full opacity-60 lg:opacity-80 scale-105"
        />
        <div className="hidden lg:block absolute bottom-[clamp(2rem,6dvh,3rem)] left-12 z-20 max-w-lg">
          <h2 className="text-[clamp(2rem,5dvh,2.25rem)] font-black text-cinema-foreground tracking-tighter mb-[clamp(0.5rem,2dvh,1rem)] leading-none">
            {heroHeading}
          </h2>
          <p className="text-cinema-foreground/75 text-[clamp(1rem,2dvh,1.125rem)] font-medium leading-relaxed">
            {heroSubheading}
          </p>
        </div>
      </div>

      {/* Right Form Column */}
      <div className="relative z-10 w-full max-w-full lg:w-1/2 h-full flex flex-col items-center overflow-y-auto overflow-x-hidden no-scrollbar p-4 lg:p-8 bg-background/80 lg:bg-background">
        <div className="w-full max-w-md my-auto animate-in fade-in slide-in-from-bottom-4 duration-500 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 mb-[clamp(0.75rem,2.5dvh,1.5rem)] w-fit hover:opacity-80 transition-opacity mx-auto lg:mx-0"
          >
            <span className="flex size-[clamp(2rem,4.5dvh,2.5rem)] items-center justify-center rounded-xl border border-primary/30 bg-primary/10 backdrop-blur-md">
              <Flame className="size-4 sm:size-5 text-primary" />
            </span>
            <span className="text-[clamp(1.125rem,2.5dvh,1.25rem)] font-black tracking-tight">
              ANI<span className="text-primary">MANGA</span>
            </span>
          </Link>

          <Card className="bg-card/90 border-border backdrop-blur-2xl shadow-2xl p-[clamp(1rem,3dvh,1.75rem)]">
            <CardHeader className="p-0 pb-[clamp(0.75rem,2dvh,1.25rem)]">
              <CardTitle className="text-[clamp(1.25rem,3dvh,1.5rem)] font-black tracking-tight text-card-foreground">
                {cardTitle}
              </CardTitle>
              <CardDescription className="text-[clamp(0.75rem,1.5dvh,0.875rem)] text-muted-foreground">
                {cardDescription}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">{children}</CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
