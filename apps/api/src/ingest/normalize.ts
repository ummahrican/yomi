import * as cheerio from "cheerio";
import { sql } from "drizzle-orm";
import type { DB } from "../db/client";
import { articles } from "../db/schema";
import { canonicalizeUrl, urlHash } from "../lib/canonicalUrl";

/** What every connector produces, ready to upsert. */
export interface NormalizedItem {
  url: string;
  title: string;
  excerpt: string | null;
  author: string | null;
  imageUrl: string | null;
  tags: string[];
  publishedAt: Date;
  externalScore: number;
  externalComments: number;
  format?: "article" | "video";
  readingMinutes?: number | null;
  commentsUrl?: string | null;
}

/** Rough read-time in minutes from (possibly HTML) content at ~200 wpm. */
export function estimateReadingMinutes(content: string | undefined | null): number | null {
  if (!content) return null;
  const words = stripHtml(content).split(/\s+/).filter(Boolean).length;
  if (words < 30) return null; // too little to be meaningful (e.g. just a summary)
  return Math.max(1, Math.round(words / 200));
}

const TAG_ALIASES: Record<string, string> = {
  js: "javascript",
  reactjs: "react",
  nodejs: "node",
  ts: "typescript",
  py: "python",
  golang: "go",
  webdev: "webdev",
  "front-end": "frontend",
  "back-end": "backend",
};

export function normalizeTags(raw: unknown[]): string[] {
  const out = new Set<string>();
  for (const entry of raw) {
    // rss-parser categories can be strings OR objects like { _: "name", $: {...} }.
    const raw0 =
      typeof entry === "string"
        ? entry
        : entry && typeof entry === "object" && "_" in entry
          ? String((entry as { _: unknown })._)
          : null;
    if (!raw0) continue;
    let tag = raw0.toLowerCase().trim().replace(/\s+/g, "-");
    tag = tag.replace(/^#/, "");
    if (!tag || tag.length > 30) continue;
    out.add(TAG_ALIASES[tag] ?? tag);
  }
  return [...out].slice(0, 8);
}

/** Strip HTML to plain text and collapse whitespace. */
export function stripHtml(html: string): string {
  const text = cheerio.load(html).text();
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Decode HTML entities in feed-provided plain text such as titles. Feeds escape
 * titles (e.g. `007 First Light&#8217;s` for `007 First Light's`); unlike
 * excerpts, titles don't pass through stripHtml, so they'd render the raw
 * entity. cheerio's .text() decodes named/numeric entities and drops any stray
 * markup without mangling literal text.
 */
export function decodeEntities(s: string): string {
  return cheerio.load(s).text();
}

/** Build a short excerpt from possibly-HTML content, truncated on a word boundary. */
export function makeExcerpt(content: string | undefined | null, max = 220): string | null {
  if (!content) return null;
  const text = stripHtml(content);
  if (!text) return null;
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}

/** Find the first reasonable <img> src inside HTML content. */
export function firstImageFromHtml(html: string | undefined | null): string | null {
  if (!html) return null;
  const $ = cheerio.load(html);
  const src = $("img").first().attr("src");
  if (!src) return null;
  if (src.startsWith("data:")) return null; // reject inline/pixel images
  return src;
}

/** Reject obvious tracking pixels / data URIs; otherwise pass through. */
export function cleanImageUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  const u = url.trim();
  if (!u || u.startsWith("data:")) return null;
  if (!/^https?:\/\//i.test(u)) return null;
  return u;
}

/** Missing dates default to now; future dates are clamped to now. */
export function clampDate(d: Date | undefined | null, now = new Date()): Date {
  if (!d || Number.isNaN(d.getTime())) return now;
  return d.getTime() > now.getTime() ? now : d;
}

/**
 * Upsert a batch of normalized items for one source. Dedup key is url_hash;
 * on conflict we merge popularity signals (keep the max) rather than duplicate.
 * Returns the number of rows inserted-or-updated.
 */
export async function upsertArticles(
  db: DB,
  sourceId: number,
  items: NormalizedItem[],
): Promise<number> {
  if (items.length === 0) return 0;

  // Dedup within the batch by url_hash: Postgres' ON CONFLICT cannot update the
  // same conflict target twice in one statement, and feeds sometimes repeat a URL.
  const byHash = new Map<string, (typeof articles)["$inferInsert"]>();
  for (const it of items) {
    if (!it.url || !it.title) continue;
    const hash = urlHash(it.url);
    const existing = byHash.get(hash);
    const row = {
      sourceId,
      canonicalUrl: canonicalizeUrl(it.url),
      urlHash: hash,
      title: decodeEntities(it.title).trim().slice(0, 500),
      excerpt: it.excerpt,
      author: it.author,
      imageUrl: cleanImageUrl(it.imageUrl),
      tags: it.tags,
      publishedAt: it.publishedAt,
      externalScore: it.externalScore,
      externalComments: it.externalComments,
      format: it.format ?? "article",
      readingMinutes: it.readingMinutes ?? null,
      commentsUrl: it.commentsUrl ?? null,
    };
    // Keep the strongest popularity signal if the URL appears twice.
    if (!existing) byHash.set(hash, row);
    else {
      existing.externalScore = Math.max(existing.externalScore ?? 0, row.externalScore ?? 0);
      existing.externalComments = Math.max(existing.externalComments ?? 0, row.externalComments ?? 0);
      existing.imageUrl ??= row.imageUrl;
      existing.excerpt ??= row.excerpt;
      existing.commentsUrl ??= row.commentsUrl;
    }
  }
  const rows = [...byHash.values()];

  if (rows.length === 0) return 0;

  const result = await db
    .insert(articles)
    .values(rows)
    .onConflictDoUpdate({
      target: articles.urlHash,
      set: {
        // Refresh the title from the feed so corrected/decoded titles replace
        // any previously-stored raw-entity versions on the next ingest.
        title: sql`EXCLUDED.title`,
        // Merge popularity signals: keep the strongest we've seen.
        externalScore: sql`GREATEST(${articles.externalScore}, EXCLUDED.external_score)`,
        externalComments: sql`GREATEST(${articles.externalComments}, EXCLUDED.external_comments)`,
        // Backfill image/excerpt/read-time if we previously lacked them.
        imageUrl: sql`COALESCE(${articles.imageUrl}, EXCLUDED.image_url)`,
        excerpt: sql`COALESCE(${articles.excerpt}, EXCLUDED.excerpt)`,
        readingMinutes: sql`COALESCE(${articles.readingMinutes}, EXCLUDED.reading_minutes)`,
        commentsUrl: sql`COALESCE(${articles.commentsUrl}, EXCLUDED.comments_url)`,
      },
    });

  return result.rowCount ?? rows.length;
}
