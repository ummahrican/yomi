-- Initial schema for daily-dev-alt.
-- Hand-authored so we can express the generated tsvector column + GIN indexes
-- that Drizzle's schema DSL cannot. The Drizzle schema in schema.ts mirrors the
-- queryable columns and is used only for typed query building.

CREATE TABLE IF NOT EXISTS sources (
  id                    SERIAL PRIMARY KEY,
  slug                  TEXT NOT NULL UNIQUE,
  name                  TEXT NOT NULL,
  kind                  TEXT NOT NULL,
  feed_url              TEXT,
  homepage_url          TEXT,
  icon_url              TEXT,
  enabled               BOOLEAN NOT NULL DEFAULT true,
  last_fetched_at       TIMESTAMPTZ,
  last_status           TEXT,
  last_error            TEXT,
  consecutive_failures  INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS articles (
  id                BIGSERIAL PRIMARY KEY,
  source_id         INTEGER NOT NULL REFERENCES sources(id),
  canonical_url     TEXT NOT NULL,
  url_hash          TEXT NOT NULL,
  title             TEXT NOT NULL,
  excerpt           TEXT,
  author            TEXT,
  image_url         TEXT,
  tags              TEXT[] NOT NULL DEFAULT '{}',
  published_at      TIMESTAMPTZ NOT NULL,
  fetched_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  external_score    INTEGER NOT NULL DEFAULT 0,
  external_comments INTEGER NOT NULL DEFAULT 0,
  upvotes           INTEGER NOT NULL DEFAULT 0,
  clicks            INTEGER NOT NULL DEFAULT 0,
  lang              TEXT DEFAULT 'en',
  tsv               tsvector GENERATED ALWAYS AS (
                      to_tsvector('english', coalesce(title, '') || ' ' || coalesce(excerpt, ''))
                    ) STORED
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_articles_url_hash ON articles (url_hash);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_tags_gin ON articles USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_articles_tsv ON articles USING GIN (tsv);

CREATE TABLE IF NOT EXISTS sponsored_posts (
  id             BIGSERIAL PRIMARY KEY,
  advertiser     TEXT NOT NULL,
  title          TEXT NOT NULL,
  excerpt        TEXT,
  image_url      TEXT,
  target_url     TEXT NOT NULL,
  display_source TEXT,
  tags           TEXT[] NOT NULL DEFAULT '{}',
  active         BOOLEAN NOT NULL DEFAULT true,
  starts_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at        TIMESTAMPTZ,
  weight         INTEGER NOT NULL DEFAULT 1,
  impressions    BIGINT NOT NULL DEFAULT 0,
  clicks         BIGINT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sponsored_active ON sponsored_posts (active, starts_at, ends_at);

CREATE TABLE IF NOT EXISTS upvote_events (
  article_id  BIGINT NOT NULL REFERENCES articles(id),
  device_id   UUID NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (article_id, device_id)
);
