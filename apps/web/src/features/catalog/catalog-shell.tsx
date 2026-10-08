import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface CatalogShellProps {
  title: string;
  description: string;
  mediaType: "anime" | "manga";
  totalItems: number;
  children: React.ReactNode;
}

export function CatalogShell({
  title,
  description,
  mediaType,
  totalItems,
  children,
}: CatalogShellProps) {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Immersive Header */}
      <div className="relative w-full border-b border-border bg-gradient-to-b from-primary/15 via-background to-background pt-28 pb-12 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-full bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-primary/20 to-transparent pointer-events-none opacity-60" />

        <div className="container mx-auto px-4 relative z-10">
          <nav className="flex items-center gap-2 text-xs md:text-sm text-foreground/50 mb-6 font-bold uppercase tracking-wider">
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3 h-3" />
            <Link
              href={`/${mediaType}`}
              className="hover:text-foreground transition-colors"
            >
              {mediaType}
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-primary">{title}</span>
          </nav>

          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-foreground mb-4 drop-shadow-lg uppercase">
            {title}
          </h1>
          <p className="text-base md:text-lg text-foreground/60 font-medium max-w-2xl">
            {description}
          </p>
        </div>
      </div>

      {/* Grid Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-border">
          <div className="text-sm font-bold text-foreground/50 uppercase tracking-widest">
            {totalItems.toLocaleString()} Results
          </div>
          {/* Add Filter Drawer/Buttons Here Later */}
        </div>

        {children}
      </div>
    </div>
  );
}
