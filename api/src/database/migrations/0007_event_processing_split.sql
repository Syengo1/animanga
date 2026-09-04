-- ==============================================================================
-- ANIMANGA PLATFORM: MIGRATION 0007
-- Separating Immutable Provider Facts from Mutable Processing State
-- ==============================================================================

-- 1. Create the new mutable processing table
CREATE TYPE integration.provider_event_processing_status AS ENUM (
    'PENDING',
    'PROCESSING',
    'PROCESSED',
    'FAILED',
    'DEAD_LETTER'
);

CREATE TABLE IF NOT EXISTS integration.provider_event_processing (
    provider_event_id UUID PRIMARY KEY REFERENCES integration.provider_events(id) ON DELETE RESTRICT,
    status integration.provider_event_processing_status NOT NULL DEFAULT 'PENDING',
    attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    started_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    last_error TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Migrate existing states (if any exist in dev environments)
INSERT INTO integration.provider_event_processing (provider_event_id, status, processed_at, last_error)
SELECT id, 
       status::text::integration.provider_event_processing_status, 
       processed_at, 
       last_error 
FROM integration.provider_events
ON CONFLICT DO NOTHING;

-- 3. Drop the mutable columns from the immutable table
ALTER TABLE integration.provider_events 
    DROP COLUMN status,
    DROP COLUMN processed_at,
    DROP COLUMN last_error;

-- 4. Clean up the old enum
DROP TYPE IF EXISTS integration.provider_event_status;