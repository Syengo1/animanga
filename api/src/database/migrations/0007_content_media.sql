CREATE SCHEMA IF NOT EXISTS content;

CREATE TABLE content.media_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) NOT NULL,
    external_id VARCHAR(100) NOT NULL,
    media_type VARCHAR(20) NOT NULL,
    title_romaji VARCHAR(500),
    title_english VARCHAR(500),
    title_native VARCHAR(500),
    synopsis TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'UNKNOWN',
    season VARCHAR(20),
    season_year INTEGER,
    cover_image_url TEXT,
    banner_image_url TEXT,
    color_hex VARCHAR(20),
    episodes INTEGER,
    chapters INTEGER,
    volumes INTEGER,
    genres TEXT[] NOT NULL DEFAULT '{}', -- Using true Postgres arrays as requested
    average_score NUMERIC(5,2),
    source_updated_at TIMESTAMPTZ,
    last_synced_at TIMESTAMPTZ,
    provider_metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(provider, external_id)
);