// C:\Projects\animanga-platform\apps\web\src\features\media\media-info-sidebar.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MediaDetailDto } from "@/lib/api/types/media";

interface MediaInfoSidebarProps {
  media: MediaDetailDto;
}

function formatFuzzyDate(
  date: {
    year: number | null;
    month: number | null;
    day: number | null;
  } | null,
): string | null {
  if (!date?.year) return null;
  if (!date.month) return String(date.year);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const monthName = months[date.month - 1] || "";
  return date.day
    ? `${monthName} ${date.day}, ${date.year}`
    : `${monthName} ${date.year}`;
}

export function MediaInfoSidebar({ media }: MediaInfoSidebarProps) {
  const [showAllTags, setShowAllTags] = useState(false);
  const [showSpoilerTags, setShowSpoilerTags] = useState(false);
  const [showAllLinks, setShowAllLinks] = useState(false);
  const [showAllSynonyms, setShowAllSynonyms] = useState(false);

  const accentColor = media.colorHex || "var(--primary)";
  const routeType = media.type === "MANGA" ? "manga" : "anime";

  const startStr = formatFuzzyDate(media.startDate);
  const endStr = formatFuzzyDate(media.endDate);

  const mainStudios =
    media.studios?.filter((s) => s.isMain || s.isAnimationStudio) || [];
  const producers =
    media.studios?.filter((s) => !s.isMain && !s.isAnimationStudio) || [];

  const nonSpoilerTags = (media.tags || []).filter((t) => !t.isSpoiler);
  const spoilerTags = (media.tags || []).filter((t) => t.isSpoiler);
  const activeTagPool = showSpoilerTags ? media.tags || [] : nonSpoilerTags;
  const visibleTags = showAllTags ? activeTagPool : activeTagPool.slice(0, 10);

  const allLinks = media.externalLinks || [];
  const visibleLinks = showAllLinks ? allLinks : allLinks.slice(0, 6);

  const synonyms = media.synonyms || [];
  const visibleSynonyms = showAllSynonyms ? synonyms : synonyms.slice(0, 3);

  return (
    <aside className="flex flex-col gap-6">
      <section className="bg-card border border-border rounded-2xl p-5 md:p-6 shadow-sm">
        <h3 className="text-sm font-black tracking-widest uppercase text-foreground mb-4">
          Information
        </h3>
        <dl className="space-y-3 text-xs sm:text-sm">
          <div className="flex justify-between border-b border-border pb-2 gap-4">
            <dt className="text-muted-foreground font-bold uppercase tracking-wide shrink-0">
              Format
            </dt>
            <dd className="text-foreground font-semibold text-right">
              {media.format?.replace(/_/g, " ") || "Unknown"}
            </dd>
          </div>

          {media.type === "ANIME" ? (
            <>
              {media.episodes && (
                <div className="flex justify-between border-b border-border pb-2 gap-4">
                  <dt className="text-muted-foreground font-bold uppercase tracking-wide shrink-0">
                    Episodes
                  </dt>
                  <dd className="text-foreground font-semibold text-right">
                    {media.episodes}
                  </dd>
                </div>
              )}
              {media.duration && (
                <div className="flex justify-between border-b border-border pb-2 gap-4">
                  <dt className="text-muted-foreground font-bold uppercase tracking-wide shrink-0">
                    Duration
                  </dt>
                  <dd className="text-foreground font-semibold text-right">
                    {media.duration} mins / ep
                  </dd>
                </div>
              )}
            </>
          ) : (
            <>
              {media.chapters && (
                <div className="flex justify-between border-b border-border pb-2 gap-4">
                  <dt className="text-muted-foreground font-bold uppercase tracking-wide shrink-0">
                    Chapters
                  </dt>
                  <dd className="text-foreground font-semibold text-right">
                    {media.chapters}
                  </dd>
                </div>
              )}
              {media.volumes && (
                <div className="flex justify-between border-b border-border pb-2 gap-4">
                  <dt className="text-muted-foreground font-bold uppercase tracking-wide shrink-0">
                    Volumes
                  </dt>
                  <dd className="text-foreground font-semibold text-right">
                    {media.volumes}
                  </dd>
                </div>
              )}
            </>
          )}

          <div className="flex justify-between border-b border-border pb-2 gap-4">
            <dt className="text-muted-foreground font-bold uppercase tracking-wide shrink-0">
              Status
            </dt>
            <dd className="text-foreground font-semibold text-right">
              {media.status?.replace(/_/g, " ") || "Unknown"}
            </dd>
          </div>

          {startStr && (
            <div className="flex justify-between border-b border-border pb-2 gap-4">
              <dt className="text-muted-foreground font-bold uppercase tracking-wide shrink-0">
                Start Date
              </dt>
              <dd className="text-foreground font-semibold text-right">
                {startStr}
              </dd>
            </div>
          )}

          {endStr && (
            <div className="flex justify-between border-b border-border pb-2 gap-4">
              <dt className="text-muted-foreground font-bold uppercase tracking-wide shrink-0">
                End Date
              </dt>
              <dd className="text-foreground font-semibold text-right">
                {endStr}
              </dd>
            </div>
          )}

          {media.seasonYear && (
            <div className="flex justify-between border-b border-border pb-2 gap-4">
              <dt className="text-muted-foreground font-bold uppercase tracking-wide shrink-0">
                Season
              </dt>
              <dd className="text-foreground font-semibold text-right">
                <Link
                  href={`/search/${routeType}?season=${media.season || ""}&year=${media.seasonYear}`}
                  className="hover:text-primary transition-colors underline-offset-4 hover:underline"
                >
                  {media.season ? `${media.season} ` : ""}
                  {media.seasonYear}
                </Link>
              </dd>
            </div>
          )}

          {media.source && (
            <div className="flex justify-between border-b border-border pb-2 gap-4">
              <dt className="text-muted-foreground font-bold uppercase tracking-wide shrink-0">
                Source
              </dt>
              <dd className="text-foreground font-semibold text-right">
                {media.source.replace(/_/g, " ")}
              </dd>
            </div>
          )}

          {media.countryOfOrigin && (
            <div className="flex justify-between border-b border-border pb-2 gap-4">
              <dt className="text-muted-foreground font-bold uppercase tracking-wide shrink-0">
                Origin
              </dt>
              <dd className="text-foreground font-semibold text-right">
                {media.countryOfOrigin}
              </dd>
            </div>
          )}

          {mainStudios.length > 0 && (
            <div className="flex justify-between border-b border-border pb-2 gap-4">
              <dt className="text-muted-foreground font-bold uppercase tracking-wide shrink-0">
                Studios
              </dt>
              <dd
                className="font-bold text-right"
                style={{ color: accentColor }}
              >
                {mainStudios.map((s) => s.name).join(", ")}
              </dd>
            </div>
          )}

          {producers.length > 0 && (
            <div className="flex justify-between border-b border-border pb-2 gap-4">
              <dt className="text-muted-foreground font-bold uppercase tracking-wide shrink-0">
                Producers
              </dt>
              <dd className="text-foreground/80 font-medium text-right line-clamp-2">
                {producers
                  .slice(0, 4)
                  .map((s) => s.name)
                  .join(", ")}
              </dd>
            </div>
          )}

          {synonyms.length > 0 && (
            <div className="flex flex-col gap-1.5 pt-1">
              <dt className="text-muted-foreground font-bold uppercase tracking-wide text-xs">
                Alternative Titles
              </dt>
              <dd className="flex flex-col gap-1 text-xs text-foreground/80 font-medium">
                {visibleSynonyms.map((syn, idx) => (
                  <span key={`${syn}-${idx}`} className="truncate">
                    {syn}
                  </span>
                ))}
                {synonyms.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setShowAllSynonyms((prev) => !prev)}
                    className="text-xs font-bold text-left mt-1 hover:underline cursor-pointer w-fit"
                    style={{ color: accentColor }}
                  >
                    {showAllSynonyms
                      ? "Show Fewer Titles"
                      : `+${synonyms.length - 3} More Titles`}
                  </button>
                )}
              </dd>
            </div>
          )}
        </dl>
      </section>

      {media.voiceLanguages?.languages?.length > 0 && (
        <section className="bg-card border border-border rounded-2xl p-5 md:p-6 shadow-sm">
          <h3 className="text-sm font-black tracking-widest uppercase text-foreground mb-4">
            Audio & Dubs
          </h3>
          <ul className="space-y-2.5">
            {media.voiceLanguages.languages.map((lang) => (
              <li
                key={lang.code}
                className="flex items-center justify-between text-xs sm:text-sm"
              >
                <span className="text-foreground font-semibold">
                  {lang.name}
                </span>
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                  <Check className="w-3.5 h-3.5" /> Available
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {allLinks.length > 0 && (
        <section className="bg-card border border-border rounded-2xl p-5 md:p-6 shadow-sm">
          <h3 className="text-sm font-black tracking-widest uppercase text-foreground mb-4">
            Where to Watch & Official Links
          </h3>
          <div className="flex flex-wrap gap-2">
            {visibleLinks.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-accent text-xs font-bold text-foreground border border-border transition-colors"
                style={
                  link.color
                    ? { borderLeftColor: link.color, borderLeftWidth: "3px" }
                    : undefined
                }
              >
                <span>{link.site}</span>
                <ExternalLink className="w-3 h-3 text-muted-foreground" />
              </a>
            ))}
          </div>

          {allLinks.length > 6 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAllLinks((prev) => !prev)}
              className="mt-3 h-8 px-2.5 text-xs font-bold gap-1 cursor-pointer"
            >
              <span>
                {showAllLinks
                  ? "Show Fewer Links"
                  : `Show All ${allLinks.length} Links`}
              </span>
              {showAllLinks ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </Button>
          )}
        </section>
      )}

      {activeTagPool.length > 0 && (
        <section className="bg-card border border-border rounded-2xl p-5 md:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-sm font-black tracking-widest uppercase text-foreground">
              Themes & Tags
            </h3>
            {spoilerTags.length > 0 && (
              <button
                type="button"
                onClick={() => setShowSpoilerTags((prev) => !prev)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                {showSpoilerTags ? (
                  <>
                    <EyeOff className="w-3 h-3" />
                    <span>Hide Spoilers</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3" />
                    <span>+{spoilerTags.length} Spoilers</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {visibleTags.map((tag) => (
              <span
                key={tag.id}
                title={tag.description || tag.name}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                  tag.isSpoiler
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                    : "bg-secondary/60 border-border text-foreground/85"
                }`}
              >
                <span>{tag.name}</span>
                {tag.rank !== null && (
                  <span className="text-[10px] font-bold text-muted-foreground">
                    {tag.rank}%
                  </span>
                )}
              </span>
            ))}
          </div>

          {activeTagPool.length > 10 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAllTags((prev) => !prev)}
              className="mt-3 h-8 px-2.5 text-xs font-bold gap-1 cursor-pointer"
            >
              <span style={{ color: accentColor }}>
                {showAllTags
                  ? "Show Fewer Tags"
                  : `Show ${activeTagPool.length - 10} More Tags`}
              </span>
              {showAllTags ? (
                <ChevronUp
                  className="w-3.5 h-3.5"
                  style={{ color: accentColor }}
                />
              ) : (
                <ChevronDown
                  className="w-3.5 h-3.5"
                  style={{ color: accentColor }}
                />
              )}
            </Button>
          )}
        </section>
      )}
    </aside>
  );
}
