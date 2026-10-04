-- Display name of the site an article actually lives on. Set for aggregator
-- items (Hacker News) so the card shows the destination site, not the aggregator.
ALTER TABLE articles ADD COLUMN IF NOT EXISTS site_name TEXT;
