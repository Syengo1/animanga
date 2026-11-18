// C:\Projects\animanga-platform\apps\web\src\app\(customer)\dashboard\page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Tv,
  BookOpen,
  Heart,
  Star,
  CalendarClock,
  Ticket,
  Sparkles,
  ArrowRight,
  Plus,
  Loader2,
  Compass,
  QrCode,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";
import {
  unwrapApiData,
  type UserLibraryResponseDto,
  type LibraryEntryDto,
  type TicketWalletItemDto,
} from "@/lib/api/types/library";
import { cn } from "@/lib/utils";

export default function UserDashboardPage() {
  const { user } = useAuth();
  const [library, setLibrary] = useState<UserLibraryResponseDto | null>(null);
  const [tickets, setTickets] = useState<TicketWalletItemDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [libRes, walletRes] = await Promise.allSettled([
        fetch("/api/v1/library", { credentials: "include" }),
        fetch("/api/v1/tickets/wallet", { credentials: "include" }),
      ]);

      if (libRes.status === "fulfilled" && libRes.value.ok) {
        const json = await libRes.value.json();
        const data = unwrapApiData<UserLibraryResponseDto>(json);
        if (data) setLibrary(data);
      }

      if (walletRes.status === "fulfilled" && walletRes.value.ok) {
        const json = await walletRes.value.json();
        const data = unwrapApiData<{ tickets: TicketWalletItemDto[] }>(json);
        if (data?.tickets) setTickets(data.tickets);
      }
    } catch {
      // Ignore errors
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  const handleIncrementProgress = async (entry: LibraryEntryDto) => {
    setUpdatingId(entry.mediaId);
    const nextProgress = entry.maxUnits
      ? Math.min(entry.maxUnits, entry.progress + 1)
      : entry.progress + 1;
    const nextStatus =
      entry.maxUnits && nextProgress >= entry.maxUnits
        ? "COMPLETED"
        : entry.status || "CURRENT";

    try {
      const res = await fetch(`/api/v1/library/${entry.mediaId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          progress: nextProgress,
          status: nextStatus,
        }),
      });
      if (res.ok) {
        await loadDashboardData();
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const formatEATDate = (isoString: string) => {
    try {
      return new Intl.DateTimeFormat("en-KE", {
        timeZone: "Africa/Nairobi",
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(isoString));
    } catch {
      return isoString;
    }
  };

  const entries = library?.entries || [];
  const stats = library?.stats;

  // ActiveWatching / Reading entries
  const activeEntries = entries
    .filter((e) => e.status === "CURRENT")
    .slice(0, 6);

  // Personal EAT Airing Radar: Releasing anime in the user's list with upcoming broadcasts
  const airingRadar = entries
    .filter(
      (e) =>
        e.mediaType === "ANIME" &&
        (e.status === "CURRENT" || e.status === "PLANNING") &&
        (e.media.status === "RELEASING" || Boolean(e.media.nextAiringAt)),
    )
    .sort((a, b) => {
      const tA = a.media.nextAiringAt
        ? new Date(a.media.nextAiringAt).getTime()
        : Number.MAX_SAFE_INTEGER;
      const tB = b.media.nextAiringAt
        ? new Date(b.media.nextAiringAt).getTime()
        : Number.MAX_SAFE_INTEGER;
      return tA - tB;
    })
    .slice(0, 4);

  const activeTickets = tickets.filter((t) => t.status === "ISSUED");
  const handle = user?.username || user?.email?.split("@")[0] || "Member";

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-xs font-bold uppercase tracking-wider">
          Loading your Animanga command center...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Top Welcome Banner */}
      <section className="relative rounded-3xl bg-card border border-border p-6 md:p-8 shadow-sm overflow-hidden">
        <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/15 text-primary text-[11px] font-black uppercase tracking-wider mb-2.5">
              <Sparkles className="w-3 h-3" />
              Personal Command Center
            </span>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-foreground">
              Welcome back, <span className="text-primary">@{handle}</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-1">
              Track your live EAT simulcast schedule, update episode &amp;
              chapter progress, and manage your convention passes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link
              href="/search/anime"
              className={cn(
                buttonVariants({ variant: "default" }),
                "h-10 px-4 rounded-xl font-bold text-xs gap-1.5 shadow-xs",
              )}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Explore Catalog</span>
            </Link>
            <Link
              href="/library"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-10 px-4 rounded-xl font-bold text-xs gap-1.5 bg-secondary/50",
              )}
            >
              <span>Open Full Library</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 6-Metric Affinity Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mt-6 pt-6 border-t border-border">
          <div className="p-3.5 rounded-2xl bg-secondary/60 border border-border">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider">
                Anime Tracked
              </span>
              <Tv className="w-3.5 h-3.5 text-primary" />
            </div>
            <p className="text-xl font-black text-foreground tabular-nums">
              {stats?.totalAnime || 0}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-secondary/60 border border-border">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider">
                Episodes Watched
              </span>
              <Sparkles className="w-3.5 h-3.5 text-primary" />
            </div>
            <p className="text-xl font-black text-foreground tabular-nums">
              {(stats?.episodesWatched || 0).toLocaleString()}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-secondary/60 border border-border">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider">
                Manga Tracked
              </span>
              <BookOpen className="w-3.5 h-3.5 text-primary" />
            </div>
            <p className="text-xl font-black text-foreground tabular-nums">
              {stats?.totalManga || 0}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-secondary/60 border border-border">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider">
                Chapters Read
              </span>
              <BookOpen className="w-3.5 h-3.5 text-success" />
            </div>
            <p className="text-xl font-black text-foreground tabular-nums">
              {(stats?.chaptersRead || 0).toLocaleString()}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-secondary/60 border border-border">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider">
                Favorites
              </span>
              <Heart className="w-3.5 h-3.5 text-destructive fill-current" />
            </div>
            <p className="text-xl font-black text-foreground tabular-nums">
              {stats?.favoritesCount || 0}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-secondary/60 border border-border">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider">
                Mean Score
              </span>
              <Star className="w-3.5 h-3.5 text-warning fill-current" />
            </div>
            <p className="text-xl font-black text-foreground tabular-nums">
              {stats?.meanScore ? `${stats.meanScore} ★` : "—"}
            </p>
          </div>
        </div>
      </section>

      {/* Personal EAT Airing Radar */}
      {airingRadar.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-6 rounded-full bg-success" />
              <h2 className="text-lg md:text-xl font-black tracking-tight uppercase text-foreground">
                Your EAT Broadcast Radar
              </h2>
            </div>
            <Link
              href="/anime/airing"
              className="text-xs font-bold text-primary hover:underline"
            >
              All Simulcasts
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {airingRadar.map((item) => {
              const title =
                item.media.title.english ||
                item.media.title.romaji ||
                "Unknown";
              const cover =
                item.media.coverImage.extraLarge ||
                item.media.coverImage.large ||
                "/placeholder.jpg";

              return (
                <Link
                  key={item.id}
                  href={`/anime/${item.mediaId}`}
                  className="flex items-center gap-3.5 p-3 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all shadow-xs"
                >
                  <div className="relative w-12 h-16 rounded-xl overflow-hidden bg-secondary shrink-0 border border-border">
                    {cover !== "/placeholder.jpg" && (
                      <Image
                        src={cover}
                        alt={title}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                      {title}
                    </p>
                    <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">
                      Your Progress: Ep {item.progress}
                      {item.maxUnits ? ` / ${item.maxUnits}` : ""}
                    </p>
                    {item.media.nextAiringAt ? (
                      <div className="inline-flex items-center gap-1.5 mt-1.5 text-[11px] font-bold text-success">
                        <CalendarClock className="w-3.5 h-3.5" />
                        <span>
                          Ep {item.media.nextAiringEpisode || "?"} •{" "}
                          {formatEATDate(item.media.nextAiringAt)} EAT
                        </span>
                      </div>
                    ) : (
                      <span className="inline-block mt-1 text-[10px] font-bold uppercase text-primary">
                        Currently Airing
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Continue Watching & Reading Shelf */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-6 rounded-full bg-primary" />
            <h2 className="text-lg md:text-xl font-black tracking-tight uppercase text-foreground">
              Continue Watching &amp; Reading
            </h2>
          </div>
          <Link
            href="/library"
            className="text-xs font-bold text-primary hover:underline"
          >
            Manage Library ({entries.length})
          </Link>
        </div>

        {activeEntries.length === 0 ? (
          <div className="p-10 rounded-2xl border border-dashed border-border bg-card/50 text-center flex flex-col items-center gap-3">
            <p className="text-sm font-bold text-foreground">
              Your active Watchlist &amp; Reading List is empty
            </p>
            <p className="text-xs text-muted-foreground max-w-md">
              Bookmark any anime or manga from the catalog or set its status to
              &ldquo;Watching&rdquo; or &ldquo;Reading&rdquo; to track episode
              and chapter progress right here.
            </p>
            <div className="flex items-center gap-3 mt-1">
              <Link
                href="/search/anime"
                className={cn(
                  buttonVariants({ variant: "default" }),
                  "h-9 px-4 rounded-xl text-xs font-bold",
                )}
              >
                Browse Anime
              </Link>
              <Link
                href="/search/manga"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-9 px-4 rounded-xl text-xs font-bold bg-card",
                )}
              >
                Browse Manga
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeEntries.map((entry) => {
              const title =
                entry.media.title.english ||
                entry.media.title.romaji ||
                "Unknown";
              const cover =
                entry.media.coverImage.extraLarge ||
                entry.media.coverImage.large ||
                "/placeholder.jpg";
              const routeType = entry.mediaType === "MANGA" ? "manga" : "anime";
              const unit = entry.mediaType === "MANGA" ? "Ch" : "Ep";
              const pct =
                entry.maxUnits && entry.maxUnits > 0
                  ? Math.min(
                      100,
                      Math.round((entry.progress / entry.maxUnits) * 100),
                    )
                  : 35;

              return (
                <div
                  key={entry.id}
                  className="p-3.5 rounded-2xl bg-card border border-border shadow-xs flex gap-3.5 items-center hover:border-primary/40 transition-all"
                >
                  <Link
                    href={`/${routeType}/${entry.mediaId}`}
                    className="relative w-16 h-24 rounded-xl overflow-hidden bg-secondary shrink-0 border border-border"
                  >
                    {cover !== "/placeholder.jpg" && (
                      <Image
                        src={cover}
                        alt={title}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    )}
                  </Link>

                  <div className="flex-1 min-w-0 flex flex-col justify-between h-24">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-secondary text-[9px] font-black uppercase text-primary">
                          {entry.mediaType}
                        </span>
                        {entry.isFavorite && (
                          <Heart className="w-3 h-3 text-destructive fill-current" />
                        )}
                      </div>
                      <Link
                        href={`/${routeType}/${entry.mediaId}`}
                        className="text-xs sm:text-sm font-bold text-foreground hover:text-primary transition-colors line-clamp-1 mt-1"
                      >
                        {title}
                      </Link>
                    </div>

                    <div className="w-full space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-muted-foreground tabular-nums">
                          {unit} {entry.progress}
                          {entry.maxUnits ? ` / ${entry.maxUnits}` : ""}
                        </span>

                        <Button
                          type="button"
                          size="xs"
                          disabled={updatingId === entry.mediaId}
                          onClick={() => void handleIncrementProgress(entry)}
                          className="h-6 px-2 rounded-lg text-[10px] font-black gap-0.5 cursor-pointer"
                        >
                          {updatingId === entry.mediaId ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              <Plus className="w-2.5 h-2.5" />
                              <span>1 {unit}</span>
                            </>
                          )}
                        </Button>
                      </div>

                      <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Bottom Row: Ticket Wallet Summary + Top Genre Affinity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Convention Tickets */}
        <section className="p-5 md:p-6 rounded-2xl bg-card border border-border shadow-xs flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ticket className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-black uppercase tracking-wider text-foreground">
                Active Convention Passes
              </h3>
            </div>
            <Link
              href="/tickets"
              className="text-xs font-bold text-primary hover:underline"
            >
              Open Wallet
            </Link>
          </div>

          {activeTickets.length === 0 ? (
            <div className="py-6 text-center border border-dashed border-border rounded-xl bg-secondary/30 px-4">
              <p className="text-xs font-bold text-foreground mb-1">
                No active event passes yet
              </p>
              <p className="text-[11px] text-muted-foreground mb-3">
                Cryptographically signed Ed25519 QR tickets for upcoming anime
                conventions appear here automatically after M-Pesa checkout.
              </p>
              <Link
                href="/tickets"
                className="text-xs font-bold text-primary hover:underline"
              >
                Go to Ticket Wallet →
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {activeTickets.slice(0, 2).map((tk) => (
                <Link
                  key={tk.id}
                  href={`/tickets/${tk.id}`}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-secondary/60 border border-border hover:border-primary/40 transition-all"
                >
                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                      {tk.ticketNumber} • {tk.ticketType}
                    </span>
                    <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                      {tk.event.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatEATDate(tk.event.startTime)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold shrink-0">
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Gate QR</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Genre Affinity Breakdown */}
        <section className="p-5 md:p-6 rounded-2xl bg-card border border-border shadow-xs flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-black uppercase tracking-wider text-foreground">
                Your Top Genre Affinity
              </h3>
            </div>
            <span className="text-[11px] font-bold text-muted-foreground">
              Based on your library
            </span>
          </div>

          {!stats?.topGenres || stats.topGenres.length === 0 ? (
            <div className="py-6 text-center border border-dashed border-border rounded-xl bg-secondary/30 px-4">
              <p className="text-xs font-bold text-foreground mb-1">
                Not enough data yet
              </p>
              <p className="text-[11px] text-muted-foreground">
                Add anime or manga to your library or favorites to unlock your
                genre affinity profile.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.topGenres.map((g) => {
                const maxCount = stats.topGenres[0]?.count || 1;
                const barPct = Math.max(
                  15,
                  Math.round((g.count / maxCount) * 100),
                );
                return (
                  <div key={g.genre} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-foreground">{g.genre}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {g.count} {g.count === 1 ? "title" : "titles"}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
