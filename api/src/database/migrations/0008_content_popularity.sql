-- Migration 0008: Add popularity metrics, adult content flags, and performance indexes

-- 1. Add the missing columns to the table
ALTER TABLE content.media_items
  ADD COLUMN IF NOT EXISTS popularity INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_adult BOOLEAN DEFAULT false;

-- 2. Index for "Popular This Season" and "Upcoming Next Season"
-- Optimizes queries filtering by type, season, year, and status, while sorting by popularity
CREATE INDEX IF NOT EXISTS idx_media_seasonal 
ON content.media_items (media_type, season, season_year, status, popularity DESC);

-- 3. Index for "Trending" and "Currently Airing"
-- Optimizes queries filtering by type and status, while sorting by popularity/last_synced
CREATE INDEX IF NOT EXISTS idx_media_status_pop 
ON content.media_items (media_type, status, popularity DESC);