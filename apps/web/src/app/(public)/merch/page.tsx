// C:\Projects\animanga-platform\apps\web\src\app\(public)\merch\page.tsx
import Link from "next/link";
import { ShoppingBag, Sparkles, ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Official Merch Drops | Animanga",
  description:
    "Limited edition anime and manga apparel, collectibles, and convention merchandise.",
};

export default function MerchDropsPage() {
  return (
    <div className="min-h-[70vh] bg-background text-foreground flex items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full rounded-3xl bg-card border border-border p-8 md:p-10 text-center shadow-sm flex flex-col items-center gap-4">
        <div className="size-14 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
          <ShoppingBag className="w-7 h-7" />
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary text-primary text-[11px] font-black uppercase tracking-widest">
          <Sparkles className="w-3 h-3" />
          Coming Soon
        </span>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase text-foreground">
          Official Merch Drops
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          Limited-run apparel, figures, and convention-exclusive merchandise
          with M-Pesa express checkout are arriving soon.
        </p>
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: "default" }),
            "mt-2 h-10 px-5 rounded-xl text-xs font-bold gap-2",
          )}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>
      </div>
    </div>
  );
}
