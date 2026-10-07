import { notFound, redirect } from "next/navigation";
import { Metadata } from "next";
import { serverFetch, ServerFetchError } from "@/lib/api/server-fetch";
import type { MediaDetailDto } from "@/lib/api/types/media";

import { MediaHero } from "@/features/media/media-hero";
import { MediaStatusPanel } from "@/features/media/media-status-panel";
import { CharacterCarousel } from "@/features/media/character-carousel";
import { MediaRelations } from "@/features/media/media-relations";
import { MediaInfoSidebar } from "@/features/media/media-info-sidebar";

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
  if (type !== "anime" && type !== "manga")
    return { title: "Not Found | Animanga" };

  try {
    const media = await getMediaDetail(id);
    const title = media.title.english || media.title.romaji || "Unknown";
    const desc =
      media.description.text.substring(0, 160) ||
      "Explore this media on Animanga.";

    return {
      title: `${title} | Animanga`,
      description: desc,
      openGraph: {
        title,
        description: desc,
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

  return (
    <main className="min-h-screen bg-background text-foreground pb-24">
      <MediaHero media={media} />

      <div className="container relative z-20 px-4 -mt-8 mb-12">
        <MediaStatusPanel media={media} />
      </div>

      <div className="container px-4 grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 flex flex-col gap-16">
          <section>
            <h3 className="text-2xl font-black tracking-tight uppercase text-white mb-6 flex items-center gap-3">
              <span
                className="w-2 h-8 rounded-sm"
                style={{ backgroundColor: media.colorHex || "var(--primary)" }}
              />
              Overview
            </h3>
            <div
              className="prose prose-invert max-w-none text-white/70 font-medium leading-relaxed prose-p:mb-4"
              dangerouslySetInnerHTML={{ __html: media.description.html }}
            />
          </section>

          {media.characters.items.length > 0 && (
            <section>
              <h3 className="text-2xl font-black tracking-tight uppercase text-white mb-6 flex items-center gap-3">
                <span
                  className="w-2 h-8 rounded-sm"
                  style={{
                    backgroundColor: media.colorHex || "var(--primary)",
                  }}
                />
                Characters & Voice Cast
              </h3>
              <CharacterCarousel characters={media.characters.items} />
            </section>
          )}

          {media.relations.items.length > 0 && (
            <MediaRelations
              relations={media.relations.items}
              accentColor={media.colorHex || "var(--primary)"}
            />
          )}
        </div>

        <div className="lg:col-span-4 flex flex-col gap-8">
          <MediaInfoSidebar media={media} />
        </div>
      </div>
    </main>
  );
}
