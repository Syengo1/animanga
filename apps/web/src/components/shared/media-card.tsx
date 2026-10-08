import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MediaCardData {
  id: string;
  providerId: string;
  provider: string;
  title: {
    english: string | null;
    romaji: string | null;
    native: string | null;
  };
  coverImage: {
    extraLarge: string | null;
    large: string | null;
    color: string | null;
  };
  colorHex?: string | null;
  status: string | null;
  format?: string | null;
  averageScore: number | null;
}

interface MediaCardProps {
  media: MediaCardData | any;
  type?: "anime" | "manga";
  mediaType?: "anime" | "manga";
  priority?: boolean;
  className?: string;
}

export function MediaCard({
  media,
  type,
  mediaType,
  priority = false,
  className,
}: MediaCardProps) {
  const activeType = mediaType || type || "anime";
  const title =
    media.title?.english ||
    media.title?.romaji ||
    media.title?.native ||
    "Unknown";
  const coverUrl =
    media.coverImage?.extraLarge ||
    media.coverImage?.large ||
    "/placeholder.jpg";
  const dominantColor = media.colorHex || "var(--primary)";

  return (
    <Link
      href={`/${activeType}/${media.id}`} // FIX: Link to the canonical Animanga UUID
      prefetch={false}
      className={cn(
        "flex flex-col gap-3 group cursor-pointer w-full",
        className,
      )}
    >
      <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-accent border border-border transition-all duration-300 group-hover:border-white/30 group-hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
        {coverUrl !== "/placeholder.jpg" && (
          <Image
            src={coverUrl}
            alt={title}
            fill
            priority={priority}
            sizes="(max-width: 640px) 150px, (max-width: 1024px) 200px, 250px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        {media.averageScore && (
          <div className="absolute top-2 left-2 bg-background/80 backdrop-blur-md px-1.5 py-0.5 rounded flex items-center gap-1 text-[10px] md:text-xs font-bold border border-border z-10">
            <Star className="w-3 h-3 text-yellow-500 fill-current" />
            {media.averageScore}%
          </div>
        )}
        {media.status && (
          <div
            className="absolute bottom-2 left-2 right-2 px-2 py-1 rounded bg-background/80 backdrop-blur-md text-[10px] font-bold text-center border border-border opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 z-10 uppercase tracking-wider"
            style={{ color: dominantColor }}
          >
            {media.status.replace(/_/g, " ")}
          </div>
        )}
      </div>
      <h4 className="text-sm md:text-base font-semibold leading-tight line-clamp-2 text-foreground/90 group-hover:text-primary transition-colors">
        {title}
      </h4>
    </Link>
  );
}
