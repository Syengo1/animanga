// C:\Projects\animanga-platform\apps\web\src\lib\api\types\library.ts
import type { MediaCardData } from "@/components/shared/media-card";

export type UserMediaStatus =
  | "CURRENT"
  | "PLANNING"
  | "COMPLETED"
  | "PAUSED"
  | "DROPPED";

export interface LibraryEntryDto {
  id: string;
  mediaId: string;
  mediaType: "ANIME" | "MANGA";
  status: UserMediaStatus | null;
  isFavorite: boolean;
  progress: number;
  maxUnits: number | null;
  score: number | null;
  notes: string | null;
  updatedAt: string;
  createdAt: string;
  media: MediaCardData & {
    nextAiringAt: string | null;
    nextAiringEpisode: number | null;
  };
}

export interface LibraryStatsDto {
  totalEntries: number;
  totalAnime: number;
  totalManga: number;
  favoritesCount: number;
  episodesWatched: number;
  chaptersRead: number;
  completedAnime: number;
  completedManga: number;
  meanScore: number | null;
  topGenres: Array<{ genre: string; count: number }>;
}

export interface UserLibraryResponseDto {
  entries: LibraryEntryDto[];
  stats: LibraryStatsDto;
}

export interface TicketWalletItemDto {
  id: string;
  ticketNumber: string;
  event: {
    id: string;
    title: string;
    startTime: string;
    venue?: string;
  };
  ticketType: string;
  status: "ISSUED" | "SCANNED" | "REVOKED" | "REFUNDED";
  credential: {
    payload: Record<string, unknown>;
    signature: string;
  };
}

export interface ActiveSessionDto {
  id: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export interface KycStatusDto {
  submitted: boolean;
  verificationStatus: "UNVERIFIED" | "VERIFIED" | "SUSPENDED";
  legalName: string | null;
  hasKraPin: boolean;
  updatedAt: string | null;
}

export function unwrapApiData<T>(raw: unknown): T | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  if ("data" in record && record.data !== undefined) {
    const inner = record.data as Record<string, unknown>;
    if (
      inner &&
      typeof inner === "object" &&
      "data" in inner &&
      inner.data !== undefined &&
      !("entries" in inner) &&
      !("tickets" in inner)
    ) {
      return inner.data as T;
    }
    return record.data as T;
  }
  return raw as T;
}
