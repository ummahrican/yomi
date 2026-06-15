-- Link to the external discussion thread (e.g. the Hacker News item).
ALTER TABLE articles ADD COLUMN IF NOT EXISTS comments_url TEXT;
