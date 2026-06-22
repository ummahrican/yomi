import { sql, type SQL } from "drizzle-orm";
import type { ArticleItem } from "@daily-alt/shared";
import { db } from "../db/client";
import { env } from "../env";

export interface OrganicRow extends ArticleItem {
  type: "article";
}

interface QueryOpts {
  limit: number;
  offset: number;
  tag?: string;
  q?: string;
  sourceSlugs?: string[];
  mutedTags?: string[];
  mutedSources?: string[];
  boostTags?: string[];
}

/**
 * HN-style gravity score, but with popularity LOG-compressed so one viral
 * Hacker News thread (score in the hundreds) doesn't bury every blog post
 * (which has no external score and ranks on recency alone).
 *
 *   P     = ln(1+external_score) + 1.5*ln(1+external_comments) + 3*upvotes
 *   score = (P+1)^0.8 / (ageHours+2)^GRAVITY
 */
function scoreExpr(): SQL {
  const g = env.GRAVITY;
  return sql`
    power(
      (ln(1 + a.external_score) + 1.5 * ln(1 + a.external_comments) + 3.0 * a.upvotes) + 1,
      0.8
    )
    / power((extract(epoch from (now() - a.published_at)) / 3600.0) + 2, ${g})
  `;
}

interface RawRow {
  id: number;
  title: string;
  canonical_url: string;
  image_url: string | null;
  excerpt: string | null;
  author: string | null;
  tags: string[];
  published_at: Date;
  upvotes: number;
  external_comments: number;
  format: "article" | "video";
  reading_minutes: number | null;
  comments_url: string | null;
  source_slug: string;
  source_name: string;
  source_icon: string | null;
  score: number;
}

/**
 * One page of organic articles. Ranking uses a window function to apply a
 * GLOBAL per-source decay (0.6^(rank-1)): a source's top story keeps its score,
 * but its 2nd/3rd/… stories are progressively demoted so the feed interleaves
 * many sources instead of letting one dominate. Offset pagination keeps this
 * deterministic ordering stable across pages.
 */
export async function queryOrganic(opts: QueryOpts): Promise<OrganicRow[]> {
  const score = scoreExpr();
  const conditions: SQL[] = [];

  // Default feed: last 90 days (wide enough for low-frequency blogs). Search
  // widens to a year; an explicit single-source browse shows the full archive
  // (so e.g. a YouTube channel's back catalog is always reachable).
  const windowDays = opts.sourceSlugs?.length ? 3650 : opts.q ? 365 : 90;
  conditions.push(sql`a.published_at > now() - (${windowDays} || ' days')::interval`);
  // Only ever surface live sources. Mirrors the ingest filter in
  // ingest/runner.ts — without this, articles from a source that was later
  // rejected or disabled would linger in the feed (the moderation gate would be
  // toothless against already-ingested content).
  conditions.push(sql`s.status = 'approved' AND s.enabled = true`);
  // NOTE: interpolating a JS array into drizzle's sql`` comma-expands it into
  // separate params (handy for IN lists), it does NOT make a Postgres array.
  // So we build IN (...) / ARRAY[...] explicitly with sql.join.
  const list = (xs: string[]) => sql.join(xs.map((x) => sql`${x}`), sql`, `);

  if (opts.tag) conditions.push(sql`${opts.tag} = ANY(a.tags)`);
  if (opts.sourceSlugs?.length) conditions.push(sql`s.slug IN (${list(opts.sourceSlugs)})`);
  if (opts.q) conditions.push(sql`a.tsv @@ websearch_to_tsquery('english', ${opts.q})`);
  // "Not interested" exclusions sent by the client each request (no stored profile).
  if (opts.mutedTags?.length)
    conditions.push(sql`NOT (a.tags && ARRAY[${list(opts.mutedTags)}]::text[])`);
  if (opts.mutedSources?.length) conditions.push(sql`s.slug NOT IN (${list(opts.mutedSources)})`);

  const whereSql = sql.join(conditions, sql` AND `);

  // Followed topics: articles whose tags overlap get a 2x ranking multiplier so
  // they rise toward the top of "For You" without excluding anything else.
  const boost = opts.boostTags?.length
    ? sql`(CASE WHEN tags && ARRAY[${list(opts.boostTags)}]::text[] THEN 4.0 ELSE 1 END)`
    : sql`1`;

  // Handicap the Hacker News aggregator so it interleaves with individual
  // sources instead of flooding the feed. Applied only to kind='hn'.
  const hnWeight = sql`(CASE WHEN source_kind = 'hn' THEN ${env.HN_RANK_WEIGHT}::float8 ELSE 1 END)`;

  const result = await db.execute(sql`
    WITH scored AS (
      SELECT
        a.id, a.title, a.canonical_url, a.image_url, a.excerpt, a.author,
        a.tags, a.published_at, a.upvotes, a.external_comments,
        a.format, a.reading_minutes, a.comments_url,
        s.slug AS source_slug, s.name AS source_name, s.icon_url AS source_icon,
        s.kind AS source_kind,
        ${score} AS score,
        row_number() OVER (PARTITION BY a.source_id ORDER BY ${score} DESC) AS src_rank
      FROM articles a
      JOIN sources s ON s.id = a.source_id
      WHERE ${whereSql}
    )
    SELECT * FROM scored
    -- Clamp the decay exponent: 0.6^(src_rank-1) underflows float8 (error 22003)
    -- once a single source has >~1389 rows in the window. By rank 700 the term is
    -- ~1e-155 — already negligible — so capping it changes ordering not at all.
    ORDER BY score * power(0.6, LEAST(src_rank - 1, 700)) * ${boost} * ${hnWeight} DESC, id DESC
    LIMIT ${opts.limit} OFFSET ${opts.offset}
  `);

  const rows = result.rows as unknown as RawRow[];
  return rows.map((r) => ({
    type: "article" as const,
    id: Number(r.id),
    title: r.title,
    url: r.canonical_url,
    source: { slug: r.source_slug, name: r.source_name, iconUrl: r.source_icon },
    imageUrl: r.image_url,
    excerpt: r.excerpt,
    author: r.author,
    tags: r.tags,
    publishedAt: new Date(r.published_at).toISOString(),
    upvotes: Number(r.upvotes),
    comments: Number(r.external_comments),
    format: r.format === "video" ? "video" : "article",
    readingMinutes: r.reading_minutes == null ? null : Number(r.reading_minutes),
    commentsUrl: r.comments_url ?? null,
    score: Number(r.score),
  }));
}
