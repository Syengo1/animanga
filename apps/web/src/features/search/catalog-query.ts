// C:\Projects\animanga-platform\apps\web\src\features\search\catalog-query.ts
import { z } from "zod";
import { MediaCardData } from "@/components/shared/media-card";

export const CatalogSortSchema = z.enum([
  "POPULARITY_DESC",
  "TRENDING_DESC",
  "SCORE_DESC",
  "START_DATE_DESC",
  "START_DATE_ASC",
  "TITLE_ASC",
  "TITLE_DESC",
  "EPISODES_DESC",
  "EPISODES_ASC",
]);

export type CatalogSortOption = z.infer<typeof CatalogSortSchema>;

export const ReleaseStateSchema = z.enum(["RELEASED", "UNRELEASED", "ALL"]);
export type ReleaseStateOption = z.infer<typeof ReleaseStateSchema>;

export const RouteCatalogQuerySchema = z.object({
  sort: CatalogSortSchema.default("POPULARITY_DESC"),
  releaseState: ReleaseStateSchema.default("RELEASED"),
  status: z
    .enum(["FINISHED", "RELEASING", "NOT_YET_RELEASED", "CANCELLED", "HIATUS"])
    .optional(),
  season: z.enum(["WINTER", "SPRING", "SUMMER", "FALL", "CURRENT"]).optional(),
  year: z.coerce.number().int().min(1940).max(2035).optional(),
  format: z.string().max(30).optional(),
  genre: z.string().max(250).optional(),
  minEpisodes: z.coerce.number().int().min(1).optional(),
  maxEpisodes: z.coerce.number().int().min(1).optional(),
  q: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(24),
  page: z.coerce.number().int().min(1).default(1),
});

export type NormalizedCatalogQuery = z.infer<typeof RouteCatalogQuerySchema>;

export function parseCatalogQuery(
  rawParams: Record<string, string | string[] | undefined>,
): NormalizedCatalogQuery {
  const flattened: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rawParams)) {
    const rawVal = Array.isArray(value) ? value[0] : value;
    if (rawVal !== undefined && rawVal !== "") {
      flattened[key] = rawVal;
    }
  }

  const parsed = RouteCatalogQuerySchema.safeParse(flattened);
  if (!parsed.success) {
    return RouteCatalogQuerySchema.parse({});
  }

  const data = parsed.data;
  // Keep releaseState and status consistent
  if (data.status === "NOT_YET_RELEASED") {
    data.releaseState = "UNRELEASED";
  }

  return data;
}

export function buildCatalogSearchParams(
  query: Partial<NormalizedCatalogQuery>,
): URLSearchParams {
  const sp = new URLSearchParams();

  if (query.q?.trim()) sp.set("q", query.q.trim());
  if (query.sort && query.sort !== "POPULARITY_DESC")
    sp.set("sort", query.sort);
  if (query.releaseState && query.releaseState !== "RELEASED") {
    sp.set("releaseState", query.releaseState);
  }
  if (query.status) sp.set("status", query.status);
  if (query.format) sp.set("format", query.format);
  if (query.season) sp.set("season", query.season);
  if (query.year) sp.set("year", String(query.year));
  if (query.genre) sp.set("genre", query.genre);
  if (query.minEpisodes) sp.set("minEpisodes", String(query.minEpisodes));
  if (query.maxEpisodes) sp.set("maxEpisodes", String(query.maxEpisodes));
  if (query.page && query.page > 1) sp.set("page", String(query.page));

  return sp;
}

export function buildBackendCatalogParams(
  mediaType: "ANIME" | "MANGA",
  query: NormalizedCatalogQuery,
): URLSearchParams {
  const sp = new URLSearchParams({
    type: mediaType,
    sort: query.sort,
    releaseState: query.releaseState,
    limit: String(query.limit),
    page: String(query.page),
  });

  if (query.status) sp.set("status", query.status);
  if (query.format) sp.set("format", query.format);
  if (query.season) sp.set("season", query.season);
  if (query.year) sp.set("year", String(query.year));
  if (query.genre) sp.set("genre", query.genre);
  if (query.minEpisodes) sp.set("minEpisodes", String(query.minEpisodes));
  if (query.maxEpisodes) sp.set("maxEpisodes", String(query.maxEpisodes));
  if (query.q) sp.set("search", query.q);

  return sp;
}

export interface CatalogPageResponse {
  items: MediaCardData[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
  };
}

export const ANIME_FORMATS = [
  { value: "TV", label: "TV Series" },
  { value: "MOVIE", label: "Movie" },
  { value: "OVA", label: "OVA" },
  { value: "ONA", label: "ONA" },
  { value: "SPECIAL", label: "Special" },
  { value: "TV_SHORT", label: "TV Short" },
] as const;

export const MANGA_FORMATS = [
  { value: "MANGA", label: "Manga" },
  { value: "NOVEL", label: "Light Novel" },
  { value: "ONE_SHOT", label: "One-Shot" },
] as const;

export const CATALOG_GENRES = [
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Fantasy",
  "Horror",
  "Mecha",
  "Mystery",
  "Psychological",
  "Romance",
  "Sci-Fi",
  "Slice of Life",
  "Sports",
  "Supernatural",
  "Thriller",
] as const;

export const EPISODE_LENGTH_PRESETS = [
  { id: "any", label: "Any Length", min: undefined, max: undefined },
  { id: "short", label: "Short (1–12)", min: 1, max: 12 },
  { id: "standard", label: "Standard (13–26)", min: 13, max: 26 },
  { id: "long", label: "Long (27–100)", min: 27, max: 100 },
  { id: "marathon", label: "100+ Club", min: 101, max: undefined },
] as const;

export function getSortOptions(routeType: "anime" | "manga") {
  const unitLabel = routeType === "anime" ? "Episodes" : "Chapters";
  return [
    { value: "POPULARITY_DESC", label: "Most Popular" },
    { value: "TRENDING_DESC", label: "Trending Now" },
    { value: "SCORE_DESC", label: "Highest Rated" },
    { value: "START_DATE_DESC", label: "Latest Releases" },
    { value: "START_DATE_ASC", label: "Oldest Releases" },
    { value: "TITLE_ASC", label: "Name (A–Z)" },
    { value: "TITLE_DESC", label: "Name (Z–A)" },
    { value: "EPISODES_DESC", label: `Most ${unitLabel}` },
    { value: "EPISODES_ASC", label: `Fewest ${unitLabel}` },
  ] as const;
}
