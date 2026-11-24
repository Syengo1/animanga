// C:\Projects\animanga-platform\apps\web\src\features\schedule\schedule-drawer.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  X,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useScheduleDrawer } from "./schedule-context";
import {
  formatClockToSecond,
  formatGmtOffset,
  formatReleaseTime,
  formatMinutesUntil,
  groupScheduleByLocalDay,
} from "./schedule-utils";
import type { ScheduleApiResponse } from "@/app/api/schedule/route";

type ReleaseFilter = "ALL" | "UPCOMING" | "RELEASED";

async function fetchScheduleFeed(): Promise<ScheduleApiResponse> {
  const res = await fetch("/api/schedule");
  if (!res.ok) {
    throw new Error("Could not load airing schedule");
  }
  return (await res.json()) as ScheduleApiResponse;
}

export function ScheduleDrawer() {
  const { isOpen, closeSchedule, toggleSchedule } = useScheduleDrawer();
  const queryClient = useQueryClient();

  const [nowMs, setNowMs] = useState<number | null>(null);
  const [releaseFilter, setReleaseFilter] = useState<ReleaseFilter>("ALL");
  const [selectedDayKey, setSelectedDayKey] = useState<string>("ALL");

  // Tick every second while drawer is open (hydrated client-side to prevent SSR mismatch)
  useEffect(() => {
    if (!isOpen) return;
    setNowMs(Date.now());
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Close on Escape key & lock background scroll when open on smaller viewports
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSchedule();
    };
    window.addEventListener("keydown", handleKeyDown);

    const prevOverflow = document.body.style.overflow;
    if (window.innerWidth < 768) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, closeSchedule]);

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["animanga-airing-schedule"],
    queryFn: fetchScheduleFeed,
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  const handlePrefetch = () => {
    void queryClient.prefetchQuery({
      queryKey: ["animanga-airing-schedule"],
      queryFn: fetchScheduleFeed,
      staleTime: 5 * 60 * 1000,
    });
  };

  const currentNowDate = useMemo(
    () => (nowMs !== null ? new Date(nowMs) : null),
    [nowMs],
  );

  const dayGroups = useMemo(() => {
    if (!data?.items?.length || !currentNowDate) return [];
    return groupScheduleByLocalDay(data.items, currentNowDate);
  }, [data?.items, currentNowDate]);

  const filteredGroups = useMemo(() => {
    const referenceMs = nowMs ?? Date.now();
    return dayGroups
      .filter(
        (group) => selectedDayKey === "ALL" || group.dayKey === selectedDayKey,
      )
      .map((group) => {
        const filteredItems = group.items.filter((item) => {
          const isReleased = item.airingAt * 1000 <= referenceMs;
          if (releaseFilter === "UPCOMING") return !isReleased;
          if (releaseFilter === "RELEASED") return isReleased;
          return true;
        });
        return { ...group, items: filteredItems };
      })
      .filter((group) => group.items.length > 0);
  }, [dayGroups, selectedDayKey, releaseFilter, nowMs]);

  const todayStats = useMemo(() => {
    const todayGroup = dayGroups.find((g) => g.isToday);
    if (!todayGroup || nowMs === null) {
      return { total: 0, released: 0, upcoming: 0 };
    }
    let released = 0;
    for (const item of todayGroup.items) {
      if (item.airingAt * 1000 <= nowMs) released++;
    }
    return {
      total: todayGroup.items.length,
      released,
      upcoming: todayGroup.items.length - released,
    };
  }, [dayGroups, nowMs]);

  const clockDisplay = currentNowDate
    ? formatClockToSecond(currentNowDate)
    : "--:--:--";
  const gmtDisplay = currentNowDate ? formatGmtOffset(currentNowDate) : "LOCAL";
  const fullDateSublabel = currentNowDate
    ? currentNowDate.toLocaleDateString("en-US", {
        weekday: "long",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

  return (
    <>
      {/* =====================================================================
          DESKTOP & TABLET VERTICAL SCHEDULE BANNER (Hidden on Mobile < 768px)
          Moves smoothly with the left drawer edge just like the reference UI.
          ===================================================================== */}
      <button
        type="button"
        onClick={toggleSchedule}
        onMouseEnter={handlePrefetch}
        aria-label={isOpen ? "Close release schedule" : "Open release schedule"}
        aria-expanded={isOpen}
        aria-controls="animanga-schedule-drawer"
        className={cn(
          "hidden md:flex fixed top-[58%] -translate-y-1/2 z-[62] flex-col items-center justify-center gap-2 py-3.5 px-2 rounded-r-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl border border-l-0 border-primary-foreground/15 cursor-pointer transition-[left,background-color,transform] duration-300 ease-out group",
          isOpen ? "left-[360px] lg:left-[380px]" : "left-0 hover:pl-2.5",
        )}
      >
        <span className="relative flex items-center justify-center">
          <CalendarClock className="w-4 h-4 shrink-0" />
          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
        </span>
        <span
          className="text-[11px] font-black tracking-[0.22em] uppercase select-none"
          style={{
            writingMode: "vertical-rl",
            transform: "rotate(180deg)",
          }}
        >
          SCHEDULE
        </span>
      </button>

      {/* Backdrop Scrim */}
      <div
        aria-hidden="true"
        onClick={closeSchedule}
        className={cn(
          "fixed inset-0 z-[60] bg-cinema/60 backdrop-blur-[2px] transition-opacity duration-300",
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        )}
      />

      {/* =====================================================================
          SLIDE-OUT DRAWER (Desktop: Left Side Cart | Mobile: Bottom Sheet)
          ===================================================================== */}
      <aside
        id="animanga-schedule-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Anime Episode Release Schedule"
        className={cn(
          "fixed z-[61] bg-card/98 backdrop-blur-2xl text-card-foreground border-border shadow-2xl flex flex-col transition-transform duration-300 ease-out",
          // Mobile: bottom sheet (zero crowding, easy thumb reach)
          "inset-x-0 bottom-0 h-[84dvh] rounded-t-3xl border-t",
          // Desktop/Tablet: left-anchored side drawer
          "md:inset-y-0 md:left-0 md:right-auto md:bottom-auto md:h-full md:w-[360px] lg:w-[380px] md:rounded-none md:border-t-0 md:border-r",
          isOpen
            ? "translate-y-0 md:translate-x-0"
            : "translate-y-full md:translate-y-0 md:-translate-x-full pointer-events-none",
        )}
      >
        {/* Mobile Grab Handle */}
        <div className="md:hidden flex justify-center pt-2.5 pb-1 shrink-0">
          <span className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Drawer Header: Live Clock to the Second + Timezone + Close */}
        <div className="px-4 sm:px-5 pt-3 md:pt-5 pb-3.5 border-b border-border shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums font-mono text-foreground leading-none">
                  {clockDisplay}
                </span>
                <span className="px-1.5 py-0.5 rounded-md bg-primary/15 text-primary text-[10px] font-black uppercase tracking-wider">
                  {gmtDisplay}
                </span>
              </div>
              <p className="text-[11px] font-semibold text-muted-foreground mt-1.5 truncate">
                {fullDateSublabel
                  ? `${fullDateSublabel} • Release times are estimated`
                  : "Release times are estimated"}
              </p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => void refetch()}
                disabled={isFetching}
                aria-label="Refresh schedule"
                title="Refresh schedule"
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
              >
                <RefreshCw
                  className={cn("w-4 h-4", isFetching && "animate-spin")}
                />
              </button>
              <button
                type="button"
                onClick={closeSchedule}
                aria-label="Close schedule drawer"
                className="p-2 rounded-xl bg-secondary/80 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Color-Code Legend & Filter Bar */}
          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex p-0.5 rounded-xl bg-secondary border border-border">
              {(
                [
                  { id: "ALL", label: "All" },
                  { id: "UPCOMING", label: "Upcoming" },
                  { id: "RELEASED", label: "Released" },
                ] as const
              ).map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setReleaseFilter(id)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                    releaseFilter === id
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {todayStats.total > 0 && (
              <div className="flex items-center gap-2.5 text-[10px] font-bold">
                <span className="inline-flex items-center gap-1 text-primary">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {todayStats.upcoming} Upcoming
                </span>
                <span className="inline-flex items-center gap-1 text-muted-foreground/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
                  {todayStats.released} Out
                </span>
              </div>
            )}
          </div>

          {/* Horizontal Day Quick-Jump Pills */}
          {dayGroups.length > 0 && (
            <div className="mt-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              <button
                type="button"
                onClick={() => setSelectedDayKey("ALL")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-bold border shrink-0 transition-colors cursor-pointer",
                  selectedDayKey === "ALL"
                    ? "bg-card border-primary text-primary"
                    : "bg-secondary/60 border-border text-muted-foreground hover:text-foreground",
                )}
              >
                7 Days
              </button>
              {dayGroups.map((group) => (
                <button
                  key={group.dayKey}
                  type="button"
                  onClick={() => setSelectedDayKey(group.dayKey)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-bold border shrink-0 transition-colors cursor-pointer",
                    selectedDayKey === group.dayKey
                      ? "bg-card border-primary text-primary"
                      : "bg-secondary/60 border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {group.shortTabLabel}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Scrollable Episode Schedule Feed */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-6">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
              <p className="text-xs font-bold uppercase tracking-wider">
                Syncing live broadcast schedule...
              </p>
            </div>
          ) : isError ? (
            <div className="py-12 px-4 rounded-2xl border border-dashed border-border bg-secondary/40 text-center space-y-3">
              <p className="text-xs font-bold text-foreground">
                Unable to load release schedule right now.
              </p>
              <button
                type="button"
                onClick={() => void refetch()}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold cursor-pointer"
              >
                Try Again
              </button>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="py-14 px-4 rounded-2xl border border-dashed border-border bg-secondary/30 text-center">
              <p className="text-xs font-bold text-foreground">
                No episodes match this filter.
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Try switching back to &ldquo;All&rdquo; or &ldquo;7 Days&rdquo;.
              </p>
            </div>
          ) : (
            filteredGroups.map((group) => (
              <section key={group.dayKey} className="space-y-2">
                {/* Date + Weekday Group Header (Matching Reference Hierarchy) */}
                <div className="sticky top-0 z-10 -mx-1 px-1 py-1.5 bg-card/95 backdrop-blur-md flex items-center justify-between border-b border-border/70">
                  <div className="flex items-baseline gap-2">
                    <span
                      className={cn(
                        "text-xs font-black tracking-wider uppercase",
                        group.isToday
                          ? "text-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {group.dateLabel}
                    </span>
                    <span
                      className={cn(
                        "text-xs font-black tracking-wider uppercase",
                        group.isToday
                          ? "text-primary"
                          : "text-muted-foreground/75",
                      )}
                    >
                      {group.weekdayLabel}
                    </span>
                  </div>
                  {group.isToday && (
                    <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[9px] font-black uppercase tracking-widest">
                      Today
                    </span>
                  )}
                </div>

                {/* Compact Episode Rows with Color Coding */}
                <ul className="space-y-1">
                  {group.items.map((item) => {
                    const referenceMs = nowMs ?? Date.now();
                    const airingMs = item.airingAt * 1000;
                    const isReleased = airingMs <= referenceMs;
                    const isAiringSoon =
                      !isReleased && airingMs - referenceMs <= 60 * 60 * 1000;

                    const title =
                      item.title.english ||
                      item.title.romaji ||
                      item.title.native ||
                      "Untitled Anime";

                    return (
                      <li key={item.scheduleId}>
                        <Link
                          href={`/anime/${item.mediaId}`}
                          onClick={closeSchedule}
                          title={`${title} — Episode ${item.episode} (${formatReleaseTime(item.airingAt)})`}
                          className={cn(
                            "group flex items-center gap-2.5 px-2.5 py-2 rounded-xl border transition-all",
                            isReleased
                              ? "border-transparent bg-transparent hover:bg-secondary/50 opacity-65 hover:opacity-90"
                              : isAiringSoon
                                ? "border-success/35 bg-success/10 hover:bg-success/15"
                                : "border-transparent bg-secondary/45 hover:bg-accent/80 hover:border-primary/30",
                          )}
                        >
                          {/* Release Time Column */}
                          <span
                            className={cn(
                              "w-11 shrink-0 font-mono text-xs font-bold tabular-nums",
                              isReleased
                                ? "text-muted-foreground/70 line-through decoration-muted-foreground/40"
                                : isAiringSoon
                                  ? "text-success"
                                  : "text-primary",
                            )}
                          >
                            {formatReleaseTime(item.airingAt)}
                          </span>

                          {/* Title Column */}
                          <div className="min-w-0 flex-1 flex items-center gap-1.5">
                            {isReleased ? (
                              <CheckCircle2 className="w-3 h-3 shrink-0 text-muted-foreground/60" />
                            ) : isAiringSoon ? (
                              <span className="w-2 h-2 rounded-full bg-success animate-pulse shrink-0" />
                            ) : null}

                            <span
                              className={cn(
                                "text-xs font-bold truncate transition-colors",
                                isReleased
                                  ? "text-muted-foreground/75"
                                  : "text-foreground group-hover:text-primary",
                              )}
                            >
                              {title}
                            </span>
                          </div>

                          {/* Episode Number + Status Tag */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isAiringSoon && (
                              <span className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-black text-success tabular-nums">
                                <Clock className="w-2.5 h-2.5" />
                                {formatMinutesUntil(item.airingAt, referenceMs)}
                              </span>
                            )}
                            <span
                              className={cn(
                                "px-1.5 py-0.5 rounded-md text-[10px] font-black tabular-nums whitespace-nowrap",
                                isReleased
                                  ? "bg-muted text-muted-foreground/70"
                                  : isAiringSoon
                                    ? "bg-success text-success-foreground"
                                    : "bg-primary/15 text-primary",
                              )}
                            >
                              Ep {item.episode}
                            </span>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </div>

        {/* Footer Strip */}
        <div className="px-4 sm:px-5 py-3 border-t border-border bg-secondary/40 flex items-center justify-between text-[11px] shrink-0">
          <span className="text-muted-foreground font-semibold">
            Greyed out = Released • Highlighted = Upcoming
          </span>
          <Link
            href="/anime/airing"
            onClick={closeSchedule}
            className="font-black text-primary hover:underline shrink-0 ml-2"
          >
            All Airing →
          </Link>
        </div>
      </aside>
    </>
  );
}
