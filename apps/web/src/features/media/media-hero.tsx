// C:\Projects\animanga-platform\apps\web\src\features\media\media-hero.tsx
import Image from "next/image";
import Link from "next/link";
import { Star, Tv, BookOpen, Users, Calendar } from "lucide-react";
import type { MediaDetailDto } from "@/lib/api/types/media";

interface MediaHeroProps {
  media: MediaDetailDto;
}

export function MediaHero({ media }: MediaHeroProps) {
  const title =
    media.title?.english ||
    media.title?.romaji ||
    media.title?.native ||
    "Unknown";
  const secondaryTitle =
    media.title?.english &&
    media.title?.romaji &&
    media.title.english.toLowerCase() !== media.title.romaji.toLowerCase()
      ? media.title.romaji
      : media.title?.native;

  const heroImage =
    media.bannerImage || media.coverImage?.extraLarge || "/placeholder.jpg";
  const posterImage =
    media.coverImage?.extraLarge ||
    media.coverImage?.large ||
    "/placeholder.jpg";
  const accentColor = media.colorHex || "var(--primary)";
  const routeType = media.type === "MANGA" ? "manga" : "anime";

  return (
    <section className="relative w-full min-h-[52vh] md:min-h-[62vh] lg:min-h-[70vh] flex items-end pt-20">
      {/* Vibrant Full-Color Background Banner */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-neutral-950">
        {heroImage !== "/placeholder.jpg" && (
          <Image
            src={heroImage}
            alt={`${title} Banner`}
            fill
            priority
            sizes="100vw"
            className="object-cover object-center opacity-75 saturate-[1.15] scale-105"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/65 to-transparent w-full md:w-3/4" />
      </div>

      <div className="container mx-auto relative z-10 px-4 pb-14 md:pb-16 flex flex-col md:flex-row items-start md:items-end gap-6 md:gap-10">
        {/* Crisp Poster Image */}
        <div className="w-40 sm:w-52 md:w-60 lg:w-72 shrink-0 shadow-2xl rounded-2xl overflow-hidden border-2 border-border relative aspect-[2/3] group bg-card">
          {posterImage !== "/placeholder.jpg" && (
            <Image
              src={posterImage}
              alt={`${title} Poster`}
              fill
              priority
              sizes="(max-width: 768px) 160px, (max-width: 1024px) 240px, 288px"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
          )}
        </div>

        {/* Hero Metadata */}
        <div className="flex-1 pb-2">
          <div
            className="w-12 h-1.5 rounded-full mb-4"
            style={{ backgroundColor: accentColor }}
          />

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight uppercase leading-[0.95] mb-2.5 text-foreground">
            {title}
          </h1>

          {(secondaryTitle || media.title?.native) && (
            <div className="flex flex-wrap items-center gap-2.5 mb-5 text-sm md:text-lg text-muted-foreground font-bold tracking-wide">
              {secondaryTitle && <span>{secondaryTitle}</span>}
              {secondaryTitle &&
                media.title?.native &&
                secondaryTitle !== media.title.native && (
                  <>
                    <span className="opacity-40">•</span>
                    <span>{media.title.native}</span>
                  </>
                )}
            </div>
          )}

          <div className="flex flex-col gap-3.5">
            <div className="flex flex-wrap items-center gap-2.5 text-xs sm:text-sm font-bold tracking-wide uppercase text-foreground">
              {media.averageScore && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400">
                  <Star className="w-4 h-4 fill-current" />
                  <span>{(media.averageScore / 10).toFixed(1)}</span>
                </div>
              )}

              {media.format && (
                <div className="flex items-center gap-1.5 border border-border px-3 py-1 rounded-lg bg-card/80 backdrop-blur-md">
                  {media.type === "ANIME" ? (
                    <Tv className="w-4 h-4 text-primary" />
                  ) : (
                    <BookOpen className="w-4 h-4 text-primary" />
                  )}
                  <span>{media.format.replace(/_/g, " ")}</span>
                </div>
              )}

              {media.status && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-card/80 border border-border backdrop-blur-md">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      media.status === "RELEASING"
                        ? "bg-emerald-500 animate-pulse"
                        : media.status === "NOT_YET_RELEASED"
                          ? "bg-amber-500"
                          : "bg-muted-foreground"
                    }`}
                  />
                  <span>{media.status.replace(/_/g, " ")}</span>
                </div>
              )}

              {media.seasonYear && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-card/80 border border-border backdrop-blur-md">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>
                    {media.season ? `${media.season} ` : ""}
                    {media.seasonYear}
                  </span>
                </div>
              )}

              {media.popularity ? (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-card/80 border border-border backdrop-blur-md text-muted-foreground">
                  <Users className="w-3.5 h-3.5" />
                  <span>{media.popularity.toLocaleString()}</span>
                </div>
              ) : null}
            </div>

            {media.genres && media.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {media.genres.map((genre) => (
                  <Link
                    key={genre}
                    href={`/search/${routeType}?genre=${encodeURIComponent(genre)}`}
                    className="px-3 py-1 rounded-full text-xs font-bold bg-secondary hover:bg-primary hover:text-primary-foreground text-secondary-foreground border border-border transition-colors"
                  >
                    {genre}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
