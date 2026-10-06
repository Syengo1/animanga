import { notFound, redirect } from "next/navigation";
import { Metadata } from "next";
import {
  Star,
  Calendar,
  Clock,
  Tv,
  Film,
  Play,
  Plus,
  BookOpen,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { CharacterCarousel } from "@/features/media/character-carousel";
import { MediaRelations } from "@/features/media/media-relations";

interface MediaPageProps {
  params: Promise<{
    type: string;
    id: string;
    slug: string;
  }>;
}

async function getMediaDetail(id: string) {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL?.replace("localhost", "127.0.0.1") ||
    "http://127.0.0.1:3001";

  try {
    const res = await fetch(`${baseUrl}/api/v1/media/${id}/details`, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) return null;

    // Use "as any" to force TypeScript to accept the dynamic JSON properties
    const json = (await res.json()) as any;
    return json?.data || json;
  } catch (error) {
    console.error(`Failed to fetch details for media ${id}:`, error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: MediaPageProps): Promise<Metadata> {
  const { type, id } = await params;

  // CRITICAL FIX: Block non-media routes before hitting the NestJS backend
  if (type !== "anime" && type !== "manga") {
    return { title: "Not Found | Animanga" };
  }

  const media = await getMediaDetail(id);

  if (!media) return { title: "Not Found | Animanga" };

  const title = media.title?.english || media.title?.romaji || "Unknown";
  const desc =
    media.description?.text?.substring(0, 160) ||
    "Explore this media on Animanga.";

  return {
    title: `${title} | Animanga`,
    description: desc,
    openGraph: {
      title,
      description: desc,
      images:
        media.bannerImage || media.coverImage?.extraLarge
          ? [media.bannerImage || media.coverImage?.extraLarge || ""]
          : [],
    },
  };
}

export default async function MediaDetailPage({ params }: MediaPageProps) {
  const { type, id, slug } = await params;

  if (type !== "anime" && type !== "manga") {
    notFound();
  }

  const media = await getMediaDetail(id);

  if (!media) {
    notFound();
  }

  if (media.slug !== slug || media.type.toLowerCase() !== type) {
    redirect(`/${media.type.toLowerCase()}/${media.id}/${media.slug}`);
  }

  const title = media.title?.english || media.title?.romaji || "Unknown";
  const heroImage =
    media.bannerImage || media.coverImage?.extraLarge || "/placeholder.jpg";
  const posterImage = media.coverImage?.extraLarge || "/placeholder.jpg";
  const accentColor = media.colorHex || "var(--primary)";

  return (
    <main className="min-h-screen bg-background text-foreground pb-24">
      <section className="relative w-full h-[60vh] md:h-[70vh] lg:h-[85vh] flex items-end">
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

        <div className="container relative z-10 px-4 pb-12 flex flex-col md:flex-row items-end gap-8 md:gap-12">
          <div className="hidden md:block w-64 lg:w-80 shrink-0 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-2xl overflow-hidden border border-white/10 relative aspect-[2/3] group">
            <Image
              src={posterImage}
              alt={`${title} Poster`}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
          </div>

          <div className="flex-1 pb-4">
            <div
              className="w-12 h-1 rounded-full mb-6 shadow-[0_0_10px_currentColor]"
              style={{ backgroundColor: accentColor, color: accentColor }}
            />
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter uppercase leading-[0.9] mb-4 text-white drop-shadow-2xl">
              {title}
            </h1>

            {media.title?.native && (
              <h2 className="text-xl md:text-2xl text-white/50 font-bold tracking-widest mb-6 uppercase">
                {media.title.native}
              </h2>
            )}

            <div className="flex flex-wrap items-center gap-4 text-sm md:text-base font-bold tracking-wide uppercase text-white/80 mb-8">
              {media.averageScore && (
                <div className="flex items-center gap-1.5 text-yellow-500">
                  <Star className="w-5 h-5 fill-current" />
                  <span>{(media.averageScore / 10).toFixed(1)}</span>
                </div>
              )}
              {media.format && (
                <div className="flex items-center gap-1.5 border border-white/20 px-3 py-1 rounded-md bg-white/5">
                  {type === "anime" ? (
                    <Tv className="w-4 h-4" />
                  ) : (
                    <BookOpen className="w-4 h-4" />
                  )}
                  <span>{media.format.replace("_", " ")}</span>
                </div>
              )}
              {media.status && (
                <div className="flex items-center gap-1.5">
                  <div
                    className={`w-2 h-2 rounded-full ${media.status === "RELEASING" ? "bg-green-500 animate-pulse" : "bg-white/40"}`}
                  />
                  <span>{media.status.replace("_", " ")}</span>
                </div>
              )}
              {media.seasonYear && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {media.season} {media.seasonYear}
                  </span>
                </div>
              )}
              {media.episodes && (
                <div className="flex items-center gap-1.5">
                  <Film className="w-4 h-4" />
                  <span>{media.episodes} EPS</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <Button className="bg-white hover:bg-white/90 text-black h-12 md:h-14 px-8 md:px-10 rounded-xl font-bold text-base transition-transform hover:scale-105">
                <Plus className="w-5 h-5 mr-2" /> Add to List
              </Button>
              {media.trailer && (
                <Button
                  variant="outline"
                  className="bg-transparent hover:bg-white/10 border-white/20 text-white h-12 md:h-14 px-6 md:px-8 rounded-xl font-bold transition-transform hover:scale-105"
                >
                  <Play className="w-5 h-5 mr-2 fill-current" /> Watch Trailer
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="container px-4 mt-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 flex flex-col gap-16">
          <section>
            <h3 className="text-2xl font-black tracking-tight uppercase text-white mb-6 flex items-center gap-3">
              <span
                className="w-2 h-8 bg-primary rounded-sm"
                style={{ backgroundColor: accentColor }}
              />
              Synopsis
            </h3>
            <div
              className="prose prose-invert max-w-none text-white/70 font-medium leading-relaxed prose-p:mb-4"
              dangerouslySetInnerHTML={{
                __html: media.description?.html || "No synopsis available.",
              }}
            />
          </section>

          {/* Characters Carousel */}
          {media.characters?.items && media.characters.items.length > 0 && (
            <section>
              <h3 className="text-2xl font-black tracking-tight uppercase text-white mb-6 flex items-center gap-3">
                <span
                  className="w-2 h-8 bg-primary rounded-sm"
                  style={{ backgroundColor: accentColor }}
                />
                Characters & Voice Cast
              </h3>
              <CharacterCarousel characters={media.characters.items} />
            </section>
          )}

          {/* Franchise Relations Grid */}
          {media.relations?.items && media.relations.items.length > 0 && (
            <MediaRelations
              relations={media.relations.items}
              accentColor={accentColor}
            />
          )}
        </div>

        <div className="lg:col-span-4 flex flex-col gap-12">
          <section className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
            <h3 className="text-lg font-black tracking-widest uppercase text-white mb-6">
              Information
            </h3>
            <dl className="space-y-4 text-sm md:text-base">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <dt className="text-white/50 font-bold uppercase tracking-wide">
                  Format
                </dt>
                <dd className="text-white font-medium text-right">
                  {media.format?.replace("_", " ") || "Unknown"}
                </dd>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <dt className="text-white/50 font-bold uppercase tracking-wide">
                  Episodes
                </dt>
                <dd className="text-white font-medium text-right">
                  {media.episodes || "Unknown"}
                </dd>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <dt className="text-white/50 font-bold uppercase tracking-wide">
                  Source
                </dt>
                <dd className="text-white font-medium text-right">
                  {media.source?.replace("_", " ") || "Unknown"}
                </dd>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <dt className="text-white/50 font-bold uppercase tracking-wide">
                  Status
                </dt>
                <dd className="text-white font-medium text-right">
                  {media.status?.replace("_", " ") || "Unknown"}
                </dd>
              </div>
              {media.studios && media.studios.length > 0 && (
                <div className="flex justify-between pt-2">
                  <dt className="text-white/50 font-bold uppercase tracking-wide">
                    Studios
                  </dt>
                  <dd
                    className="text-primary font-bold text-right"
                    style={{ color: accentColor }}
                  >
                    {media.studios
                      .filter((s: any) => s.isMain)
                      .map((s: any) => s.name)
                      .join(", ")}
                  </dd>
                </div>
              )}
            </dl>
          </section>
        </div>
      </div>
    </main>
  );
}
