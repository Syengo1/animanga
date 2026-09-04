import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Flame, Tv } from "lucide-react";
import { apiClient, type components } from "@animanga/api-client";

import InteractiveSphereGallery from "@/components/canvas/InteractiveSphereGallery";
import ScrollIndicator from "@/components/canvas/ScrollIndicator";

type MediaDto = components["schemas"]["MediaResponseDto"];

export default async function HomePage() {
  let responseData;
  let fetchError = false;

  try {
    const { data, error } = await apiClient.GET("/api/v1/media/trending", {
      params: {
        query: {
          limit: 6,
          type: "ANIME",
        },
      },
      next: { revalidate: 3600 },
    });

    if (error) fetchError = true;
    responseData = data;
  } catch (err) {
    console.error("Network error fetching trending media:", err);
    fetchError = true;
  }

  const rawData = responseData?.data;
  const trendingAnime: MediaDto[] = Array.isArray(rawData)
    ? rawData
    : rawData &&
        typeof rawData === "object" &&
        "data" in rawData &&
        Array.isArray((rawData as any).data)
      ? (rawData as any).data
      : [];

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1">
        <section className="relative w-full h-[100svh] bg-black overflow-hidden">
          <InteractiveSphereGallery />
          <ScrollIndicator />
        </section>

        <section
          id="trending-section"
          className="py-24 bg-background border-t border-white/5 relative z-20"
        >
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-end mb-12">
              <div>
                <h2 className="text-3xl font-black tracking-tight mb-2 flex items-center gap-3">
                  <Tv className="w-8 h-8 text-primary" />
                  Trending Anime
                </h2>
                <p className="text-muted-foreground">
                  The hottest series worldwide right now.
                </p>
              </div>
            </div>

            {fetchError && (
              <div className="p-4 border border-destructive bg-destructive/10 text-destructive rounded-lg">
                Failed to load trending media. Please try again later.
              </div>
            )}

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trendingAnime.map((media) => {
                const title =
                  media.title.english || media.title.romaji || "Unknown Title";
                const dominantColor = media.colorHex || "var(--primary)";

                return (
                  <Card
                    key={media.externalId}
                    className="bg-background/50 border-white/10 overflow-hidden group flex flex-col"
                    style={
                      { "--hover-color": dominantColor } as React.CSSProperties
                    }
                  >
                    <div className="aspect-[16/9] bg-white/5 relative overflow-hidden">
                      {media.coverImageUrl && (
                        <Image
                          src={media.coverImageUrl}
                          alt={title}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover transition-transform duration-700 group-hover:scale-105 opacity-60 group-hover:opacity-80"
                        />
                      )}

                      <div
                        className="absolute inset-0 opacity-40 transition-opacity duration-500 group-hover:opacity-60 mix-blend-overlay"
                        style={{ backgroundColor: dominantColor }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />

                      <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold border border-white/10 flex items-center gap-2 z-10">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: dominantColor }}
                        />
                        {media.status}
                      </div>
                    </div>
                    <CardHeader className="flex-1">
                      <CardTitle className="text-xl line-clamp-1">
                        {title}
                      </CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                        {media.episodes && (
                          <div className="flex items-center gap-1">
                            <Tv className="w-4 h-4" />
                            <span>{media.episodes} Episodes</span>
                          </div>
                        )}
                        {media.averageScore && (
                          <div className="flex items-center gap-1">
                            <Flame className="w-4 h-4" />
                            <span>{media.averageScore}%</span>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground line-clamp-3">
                        {media.synopsis
                          ? media.synopsis.replace(/<\/?[^>]+(>|$)/g, "")
                          : "No description available."}
                      </div>
                    </CardContent>
                    <CardFooter className="border-t border-white/5 pt-6 mt-4">
                      <div className="flex flex-wrap gap-2">
                        {media.genres.slice(0, 3).map((genre) => (
                          <Badge
                            key={genre}
                            variant="secondary"
                            className="bg-white/5 hover:bg-white/10"
                          >
                            {genre}
                          </Badge>
                        ))}
                      </div>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-32 relative z-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center border border-primary/20 bg-primary/5 rounded-3xl p-12 relative overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-primary/20 to-transparent pointer-events-none" />
              <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4 relative z-10">
                Never miss a ticket drop.
              </h2>
              <p className="text-muted-foreground mb-8 relative z-10 max-w-lg mx-auto">
                Join our newsletter to get early access to convention tickets,
                exclusive merch drops, and community announcements.
              </p>
              <form className="flex max-w-md mx-auto relative z-10 gap-2">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  className="h-12 bg-background border-white/20 focus-visible:ring-primary"
                />
                <Button type="submit" className="h-12 px-8 font-bold">
                  Subscribe
                </Button>
              </form>
            </div>
          </div>
        </section>
      </div>

      <footer className="border-t border-white/10 bg-black/50 py-12 relative z-20">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Flame className="w-5 h-5 text-primary" />
            <span className="font-black text-foreground">ANIMANGA</span>
          </div>
          <p className="text-sm">
            Built with Next.js & NestJS. Cryptographically secured.
          </p>
          <p className="text-xs mt-2 opacity-50">
            © 2026 Animanga Platform. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
