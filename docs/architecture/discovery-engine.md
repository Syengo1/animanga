# Animanga Discovery Engine Specification

## 1. Discovery Feeds (feed_key)

The platform defines 5 primary discovery feeds.

- `TRENDING_THIS_WEEK`: Media with the highest aggregate daily trend velocity over the past 7 days.
- `NEW_RELEASES`: Media released within the last 30 days (`startDate`), sorted by recency and popularity.
- `CURRENTLY_AIRING`: Media currently `RELEASING`.
- `UPCOMING_RELEASES`: Media `NOT_YET_RELEASED` with a `startDate` in the future (180-day horizon limit).
- `POPULAR_THIS_SEASON`: Media matching the current canonical calendar season and year.

## 2. Core Rules & Constraints

- **Adult Content:** `isAdult = false` is strictly enforced at the Provider ingestion level for all public feeds.
- **Null Dates:** TBA anime (null `startDate`) are excluded from `NEW_RELEASES` and `UPCOMING_RELEASES`, but are permitted in `TRENDING_THIS_WEEK` or `POPULAR_THIS_SEASON` if other criteria are met.
- **Season Resolution:** Seasons are calculated based on the canonical `season` and `seasonYear` defined by the provider, not naive local month mapping.

## 3. Scoring Formulas

All scores are normalized between `0.00` and `1.00` before applying the final multiplier.

**Base Components:**

- `popularityScore` = `log(1 + popularity) / log(1 + maxPopularity)`
- `urgencyScore` = `1 / (1 + daysUntilRelease / 30)`

**Final Calculation:**

- `baseScore` = `(0.55 * urgencyScore) + (0.45 * popularityScore)`
- `finalScore` = `baseScore * editorialMultiplier`

## 4. Editorial Overrides

Overrides are bound to a specific `media_id` and `feed_key`. They must be time-bounded (`starts_at`, `ends_at`).

- `1.00`: Default / No boost
- `1.05`: Notable
- `1.15`: Highly Anticipated
- `1.30`: Flagship Release

## 5. Cache TTLs & Refresh Schedules

- `TRENDING_THIS_WEEK`: Recalculated daily at 00:00 UTC (post-trend ingestion).
- `UPCOMING_RELEASES`: Recalculated every 15 minutes.
- `NEW_RELEASES` / `CURRENTLY_AIRING` / `POPULAR_THIS_SEASON`: Recalculated every 60 minutes.
