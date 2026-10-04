import { z } from "zod";
import { MediaCardData } from "@/components/shared/media-card";

export const CatalogSortSchema = z.enum([
  "POPULARITY_DESC",
  "SCORE_DESC",
  "START_DATE_DESC",
  "TRENDING_DESC",
]);

export const RouteCatalogQuerySchema = z.object({
  sort: CatalogSortSchema.default("POPULARITY_DESC"),
  status: z
    .enum(["FINISHED", "RELEASING", "NOT_YET_RELEASED", "CANCELLED", "HIATUS"])
    .optional(),
  format: z.string().max(30).optional(),
  genre: z.string().max(30).optional(),
  q: z.string().trim().max(100).optional(),
  limit: z.coerce.number().min(1).max(50).default(24),
  cursor: z.string().optional(),
});

export type NormalizedCatalogQuery = z.infer<typeof RouteCatalogQuerySchema>;

export function parseCatalogQuery(
  rawParams: Record<string, string | string[] | undefined>,
): NormalizedCatalogQuery {
  const flattened: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rawParams)) {
    flattened[key] = Array.isArray(value) ? value[0] : value;
  }
  const result = RouteCatalogQuerySchema.safeParse(flattened);
  return result.success ? result.data : RouteCatalogQuerySchema.parse({});
}

export function catalogQueryKey(
  type: "ANIME" | "MANGA",
  query: NormalizedCatalogQuery,
) {
  return [
    "catalog",
    {
      type,
      sort: query.sort,
      status: query.status,
      format: query.format,
      genre: query.genre,
      q: query.q,
    },
  ] as const;
}

// NEW: Local fallback interface to fix the import error
export interface CatalogPageResponse {
  items: MediaCardData[];
  pagination: {
    nextCursor: string | null;
    hasNextPage: boolean;
    limit: number;
  };
}
