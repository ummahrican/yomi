-- Video content + read/watch time.
ALTER TABLE sources  ADD COLUMN IF NOT EXISTS content_type TEXT NOT NULL DEFAULT 'article';
ALTER TABLE articles ADD COLUMN IF NOT EXISTS format TEXT NOT NULL DEFAULT 'article';
ALTER TABLE articles ADD COLUMN IF NOT EXISTS reading_minutes INTEGER;
