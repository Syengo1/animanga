ALTER TABLE content.media_items
  ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;


CREATE INDEX IF NOT EXISTS idx_media_upcoming 
ON content.media_items (media_type, status, start_date ASC, popularity DESC);