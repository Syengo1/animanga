-- Migration 0009: Animanga Discovery Engine & Anti-Corruption Layer Updates

-- 1. Ensure canonical source facts exist on the media_items table
ALTER TABLE content.media_items
  ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS format VARCHAR(50),
  ADD COLUMN IF NOT EXISTS duration INTEGER;

-- 2. Time-Series Provider Data: Trend Snapshots
CREATE TABLE IF NOT EXISTS content.media_trend_snapshots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    media_id UUID NOT NULL REFERENCES content.media_items(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    snapshot_date DATE NOT NULL,
    trending INTEGER DEFAULT 0,
    popularity INTEGER DEFAULT 0,
    average_score NUMERIC(5,2),
    in_progress INTEGER DEFAULT 0,
    releasing INTEGER DEFAULT 0,
    episode INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Ensures we don't duplicate daily records from the same provider
    CONSTRAINT uq_provider_media_date UNIQUE (provider, media_id, snapshot_date)
);

-- 3. Platform Data: Discovery Scores (The Ranking State)
CREATE TABLE IF NOT EXISTS content.media_discovery_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    media_id UUID NOT NULL REFERENCES content.media_items(id) ON DELETE CASCADE,
    feed_key VARCHAR(50) NOT NULL,
    algorithm_version VARCHAR(50) NOT NULL,
    
    raw_popularity INTEGER DEFAULT 0,
    popularity_score NUMERIC(5,4) DEFAULT 0,
    urgency_score NUMERIC(5,4) DEFAULT 0,
    recency_score NUMERIC(5,4) DEFAULT 0,
    trend_score NUMERIC(5,4) DEFAULT 0,
    editorial_score NUMERIC(5,4) DEFAULT 0,
    final_score NUMERIC(8,4) DEFAULT 0,
    
    rank INTEGER,
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    
    -- Only one active ranking per media per feed
    CONSTRAINT uq_media_feed UNIQUE (media_id, feed_key)
);

-- 4. Platform Data: Editorial Overrides (The CMS Curation)
CREATE TABLE IF NOT EXISTS content.media_editorial_overrides (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    media_id UUID NOT NULL REFERENCES content.media_items(id) ON DELETE CASCADE,
    feed_key VARCHAR(50) NOT NULL,
    
    weight INTEGER DEFAULT 0 CHECK (weight >= 0),
    multiplier NUMERIC(5,2) DEFAULT 1.00 CHECK (multiplier >= 0),
    reason TEXT,
    
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    
    created_by UUID, -- Can later be mapped to identity.users
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_trend_snapshots_media ON content.media_trend_snapshots(media_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_discovery_feed_rank ON content.media_discovery_scores(feed_key, rank ASC, final_score DESC);
CREATE INDEX IF NOT EXISTS idx_editorial_active ON content.media_editorial_overrides(media_id, feed_key, ends_at);