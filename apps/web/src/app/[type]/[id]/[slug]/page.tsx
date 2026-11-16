// C:\Projects\animanga-platform\apps\web\src\app\[type]\[id]\[slug]\page.tsx
import { notFound, redirect } from "next/navigation";
import { Metadata } from "next";
import { serverFetch, ServerFetchError } from "@/lib/api/server-fetch";
import type { MediaDetailDto } from "@/lib/api/types/media";
import { MediaHero } from "@/features/media/media-hero";
import { MediaStatusPanel } from "@/features/media/media-status-panel";
import { CharacterCarousel } from "@/features/media/character-carousel";
import { MediaRelations } from "@/features/media/media-relations";
import { StaffSection } from "@/features/media/staff-section";
import { MediaInfoSidebar } from "@/features/media/media-info-sidebar";
import { MediaRecommendations } from "@/features/media/media-recommendations";
import { ExpandableSynopsis } from "@/components/shared/expandable-section";

interface MediaPageProps {
  params: Promise<{ type: string; id: string; slug: string }>;
}

async function getMediaDetail(id: string): Promise<MediaDetailDto> {
  try {
    const res = await serverFetch<{ data: MediaDetailDto }>(
      `/api/v1/media/${id}/details`,
      {
        next: { revalidate: 3600 },
      },
    );
    return res.data || (res as unknown as MediaDetailDto);
  } catch (error) {
    if (error instanceof ServerFetchError) {
      if (error.status === 404) notFound();
      throw new Error(
        `Provider Data Synchronization Failed: HTTP ${error.status}`,
      );
    }
    throw error;
  }
}

export async function generateMetadata({
  params,
}: MediaPageProps): Promise<Metadata> {
  const { type, id } = await params;
  if (type !== "anime" && type !== "manga") {
    return { title: "Not Found" };
  }

  try {
    const media = await getMediaDetail(id);
    const title = media.title.english || media.title.romaji || "Unknown";
    const desc =
      media.description.text.substring(0, 160) ||
      `Explore ${title} episodes, cast, and release schedule on Animanga.`;
    const canonicalPath = `/${media.type.toLowerCase()}/${media.id}/${media.slug}`;

    return {
      title,
      description: desc,
      alternates: {
        canonical: canonicalPath,
      },
      openGraph: {
        title: `${title} | Animanga`,
        description: desc,
        url: canonicalPath,
        type: media.type === "ANIME" ? "video.tv_show" : "book",
        images:
          media.bannerImage || media.coverImage.extraLarge
            ? [media.bannerImage || media.coverImage.extraLarge || ""]
            : [],
      },
    };
  } catch {
    return { title: "Animanga" };
  }
}

export default async function MediaDetailPage({ params }: MediaPageProps) {
  const { type, id, slug } = await params;

  if (type !== "anime" && type !== "manga") notFound();

  const media = await getMediaDetail(id);

  if (media.slug !== slug || media.type.toLowerCase() !== type) {
    redirect(`/${media.type.toLowerCase()}/${media.id}/${media.slug}`);
  }

  const title = media.title.english || media.title.romaji || "Unknown";
  const accentColor = media.colorHex || "var(--primary)";
  const youtubeTrailerId =
    media.trailer?.site?.toLowerCase() === "youtube" ? media.trailer.id : null;

  const mediaJsonLd = {
    "@context": "https://schema.org",
    "@type": media.type === "ANIME" ? "TVSeries" : "Book",
    name: title,
    alternateName: [
      media.title.romaji,
      media.title.native,
      ...(media.synonyms || []),
    ].filter(Boolean),
    description: media.description.text,
    image: media.coverImage.extraLarge || media.bannerImage,
    genre: media.genres,
    ...(media.averageScore
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: (media.averageScore / 10).toFixed(1),
            bestRating: "10",
            worstRating: "1",
            ratingCount: media.popularity || 100,
          },
        }
      : {}),
  };

  return (
    <article className="min-h-screen bg-background text-foreground pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(mediaJsonLd) }}
      />

      <MediaHero media={media} />

      <div className="container mx-auto relative z-20 px-4 -mt-8 mb-10">
        <MediaStatusPanel
          media={media}
          nextAiring={media.airing?.nextEpisode}
        />
      </div>

      <div className="container mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 flex flex-col gap-12">
          {/* Expandable Synopsis */}
          <section>
            <h3 className="text-xl md:text-2xl font-black tracking-tight uppercase text-foreground mb-4 flex items-center gap-2.5">
              <span
                className="w-2 h-7 rounded-sm"
                style={{ backgroundColor: accentColor }}
              />
              Synopsis
            </h3>
            <ExpandableSynopsis
              html={media.description.html}
              text={media.description.text}
              accentColor={accentColor}
            />
          </section>

          {/* Characters & Voice Cast with Language Switcher & Expandable Grid */}
          {media.characters.items.length > 0 && (
            <section>
              <h3 className="text-xl md:text-2xl font-black tracking-tight uppercase text-foreground mb-4 flex items-center gap-2.5">
                <span
                  className="w-2 h-7 rounded-sm"
                  style={{ backgroundColor: accentColor }}
                />
                Characters & Voice Cast
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-secondary text-muted-foreground border border-border">
                  {media.characters.items.length}
                </span>
              </h3>
              <CharacterCarousel
                characters={media.characters.items}
                accentColor={accentColor}
              />
            </section>
          )}

          {/* Franchise & Relations with Filter Tabs & Show More */}
          {media.relations.items.length > 0 && (
            <MediaRelations
              relations={media.relations.items}
              accentColor={accentColor}
            />
          )}

          {/* Production Staff with Show More */}
          {media.staff?.items?.length > 0 && (
            <StaffSection staff={media.staff.items} accentColor={accentColor} />
          )}

          {/* Embedded Official Trailer */}
          {youtubeTrailerId && (
            <section>
              <h3 className="text-xl md:text-2xl font-black tracking-tight uppercase text-foreground mb-4 flex items-center gap-2.5">
                <span
                  className="w-2 h-7 rounded-sm"
                  style={{ backgroundColor: accentColor }}
                />
                Official Trailer
              </h3>
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-border bg-neutral-950 shadow-lg">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${youtubeTrailerId}`}
                  title={`${title} Official Trailer`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                  className="absolute inset-0 w-full h-full"
                />
              </div>
            </section>
          )}

          {/* Expandable Recommendations */}
          {media.recommendations?.items?.length > 0 && (
            <MediaRecommendations
              recommendations={media.recommendations.items}
              mediaType={type as "anime" | "manga"}
              accentColor={accentColor}
            />
          )}
        </div>

        <div className="lg:col-span-4">
          <MediaInfoSidebar media={media} />
        </div>
      </div>
    </article>
  );
}
