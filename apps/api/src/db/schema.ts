import { sql } from "drizzle-orm";
import {
  bigint,
  bigserial,
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/** Every feed/connector we ingest from (RSS feeds + API connectors). */
export const sources = pgTable("sources", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  kind: text("kind").notNull(), // 'rss' | 'hn' | 'devto'
  contentType: text("content_type").notNull().default("article"), // 'article' | 'video'
  feedUrl: text("feed_url"),
  homepageUrl: text("homepage_url"),
  iconUrl: text("icon_url"),
  enabled: boolean("enabled").notNull().default(true),
  // 'approved' | 'pending' | 'rejected' — community submissions start 'pending'.
  status: text("status").notNull().default("approved"),
  submittedByDevice: uuid("submitted_by_device"),
  votes: integer("votes").notNull().default(0),
  lastFetchedAt: timestamp("last_fetched_at", { withTimezone: true }),
  lastStatus: text("last_status"), // 'ok' | 'error'
  lastError: text("last_error"),
  consecutiveFailures: integer("consecutive_failures").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** One vote per anonymous device per submitted source. */
export const sourceVotes = pgTable(
  "source_votes",
  {
    sourceId: integer("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    deviceId: uuid("device_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.sourceId, t.deviceId] }),
  }),
);

/** Deduped, canonicalized articles. */
export const articles = pgTable(
  "articles",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    sourceId: integer("source_id")
      .notNull()
      .references(() => sources.id),
    canonicalUrl: text("canonical_url").notNull(),
    urlHash: text("url_hash").notNull(),
    title: text("title").notNull(),
    excerpt: text("excerpt"),
    author: text("author"),
    imageUrl: text("image_url"),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    externalScore: integer("external_score").notNull().default(0),
    externalComments: integer("external_comments").notNull().default(0),
    upvotes: integer("upvotes").notNull().default(0),
    clicks: integer("clicks").notNull().default(0),
    format: text("format").notNull().default("article"), // 'article' | 'video'
    readingMinutes: integer("reading_minutes"),
    commentsUrl: text("comments_url"),
    lang: text("lang").default("en"),
    // NOTE: a generated `tsv` tsvector column + GIN indexes (tags, tsv) are
    // created via the hand-written SQL migration (Drizzle can't express
    // generated tsvector columns). They are queried with raw SQL, not here.
  },
  (t) => ({
    urlHashUq: uniqueIndex("uq_articles_url_hash").on(t.urlHash),
    publishedIdx: index("idx_articles_published_at").on(t.publishedAt),
  }),
);

/** Paid/promoted posts injected into the feed. */
export const sponsoredPosts = pgTable(
  "sponsored_posts",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    advertiser: text("advertiser").notNull(),
    title: text("title").notNull(),
    excerpt: text("excerpt"),
    imageUrl: text("image_url"),
    targetUrl: text("target_url").notNull(),
    displaySource: text("display_source"),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    active: boolean("active").notNull().default(true),
    startsAt: timestamp("starts_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    weight: integer("weight").notNull().default(1),
    impressions: bigint("impressions", { mode: "number" }).notNull().default(0),
    clicks: bigint("clicks", { mode: "number" }).notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    activeIdx: index("idx_sponsored_active").on(t.active, t.startsAt, t.endsAt),
  }),
);

/** One anonymous upvote per device per article (privacy-friendly dedup). */
export const upvoteEvents = pgTable(
  "upvote_events",
  {
    articleId: bigint("article_id", { mode: "number" })
      .notNull()
      .references(() => articles.id),
    deviceId: uuid("device_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.articleId, t.deviceId] }),
  }),
);

/** Anonymous E2E-encrypted sync mailbox: opaque id -> ciphertext. */
export const syncBlobs = pgTable("sync_blobs", {
  accountId: text("account_id").primaryKey(),
  payload: text("payload").notNull(),
  version: integer("version").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SourceRow = typeof sources.$inferSelect;
export type ArticleRow = typeof articles.$inferSelect;
export type SponsoredPostRow = typeof sponsoredPosts.$inferSelect;
