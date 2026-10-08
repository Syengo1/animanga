import Image from "next/image";
import { Star, Tv, BookOpen } from "lucide-react";

interface MediaHeroProps {
  media: any; // We will use the exported interface from page.tsx later
}

export function MediaHero({ media }: MediaHeroProps) {
  const title = media.title?.english || media.title?.romaji || "Unknown";
  const heroImage =
    media.bannerImage || media.coverImage?.extraLarge || "/placeholder.jpg";
  const posterImage = media.coverImage?.extraLarge || "/placeholder.jpg";
  const accentColor = media.colorHex || "var(--primary)";

  return (
    <section className="relative w-full h-[60vh] md:h-[70vh] lg:h-[85vh] flex items-end">
      {/* Background Banner */}
      <div className="absolute inset-0 z-0">
        <Image
          src={heroImage}
          alt={`${title} Banner`}
          fill
          priority
          className="object-cover object-top opacity-40 blur-sm mix-blend-luminosity"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent w-full md:w-3/4" />
      </div>

      <div className="container relative z-10 px-4 pb-20 flex flex-col md:flex-row items-end gap-8 md:gap-12">
        {/* Poster Image (Desktop) */}
        <div className="hidden md:block w-64 lg:w-80 shrink-0 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-2xl overflow-hidden border border-border relative aspect-[2/3] group">
          <Image
            src={posterImage}
            alt={`${title} Poster`}
            fill
            sizes="(max-width: 1024px) 256px, 320px"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        </div>

        {/* Hero Content */}
        <div className="flex-1 pb-4">
          <div
            className="w-12 h-1 rounded-full mb-6 shadow-[0_0_10px_currentColor]"
            style={{ backgroundColor: accentColor, color: accentColor }}
          />
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter uppercase leading-[0.9] mb-4 text-foreground drop-shadow-2xl">
            {title}
          </h1>

          {media.title?.native && (
            <h2 className="text-xl md:text-2xl text-foreground/50 font-bold tracking-widest mb-6 uppercase">
              {media.title.native}
            </h2>
          )}

          {/* Core Badges & Genres */}
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex flex-wrap items-center gap-4 text-sm md:text-base font-bold tracking-wide uppercase text-foreground/80">
              {media.averageScore && (
                <div className="flex items-center gap-1.5 text-yellow-500">
                  <Star className="w-5 h-5 fill-current" />
                  <span>{(media.averageScore / 10).toFixed(1)}</span>
                </div>
              )}
              {media.format && (
                <div className="flex items-center gap-1.5 border border-white/20 px-3 py-1 rounded-md bg-accent">
                  {media.type === "ANIME" ? (
                    <Tv className="w-4 h-4" />
                  ) : (
                    <BookOpen className="w-4 h-4" />
                  )}
                  <span>{media.format.replace(/_/g, " ")}</span>
                </div>
              )}
              {media.status && (
                <div className="flex items-center gap-1.5">
                  <div
                    className={`w-2 h-2 rounded-full ${media.status === "RELEASING" ? "bg-green-500 animate-pulse" : "bg-white/40"}`}
                  />
                  <span>{media.status.replace(/_/g, " ")}</span>
                </div>
              )}
            </div>

            {media.genres && media.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 text-xs md:text-sm text-foreground/60 font-medium">
                {media.genres.join(" · ")}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
