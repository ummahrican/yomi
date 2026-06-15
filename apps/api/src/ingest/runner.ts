import { eq, sql } from "drizzle-orm";
import pLimit from "p-limit";
import { db } from "../db/client";
import { sources, type SourceRow } from "../db/schema";
import { fetchDevto } from "./devto";
import { fetchHackerNews } from "./hackernews";
import { type NormalizedItem, upsertArticles } from "./normalize";
import { fetchRssFeed } from "./rss";

const MAX_CONSECUTIVE_FAILURES = 10;
const sourceConcurrency = pLimit(5);

async function fetchForSource(source: SourceRow): Promise<NormalizedItem[]> {
  switch (source.kind) {
    case "rss":
      if (!source.feedUrl) throw new Error("rss source missing feed_url");
      return fetchRssFeed(source.feedUrl, { video: source.contentType === "video" });
    case "hn":
      return fetchHackerNews();
    case "devto":
      return fetchDevto();
    default:
      throw new Error(`unknown source kind: ${source.kind}`);
  }
}

async function markOk(id: number) {
  await db
    .update(sources)
    .set({
      lastFetchedAt: new Date(),
      lastStatus: "ok",
      lastError: null,
      consecutiveFailures: 0,
    })
    .where(eq(sources.id, id));
}

async function markError(source: SourceRow, err: unknown) {
  const failures = source.consecutiveFailures + 1;
  const disable = failures >= MAX_CONSECUTIVE_FAILURES;
  await db
    .update(sources)
    .set({
      lastFetchedAt: new Date(),
      lastStatus: "error",
      lastError: String(err instanceof Error ? err.message : err).slice(0, 500),
      consecutiveFailures: failures,
      ...(disable ? { enabled: false } : {}),
    })
    .where(eq(sources.id, source.id));
  if (disable) {
    console.warn(`[ingest] auto-disabled "${source.slug}" after ${failures} consecutive failures`);
  }
}

/** Ingest a single source: fetch -> upsert -> update health. Never throws. */
export async function ingestSource(source: SourceRow): Promise<{ slug: string; count: number; ok: boolean }> {
  try {
    const items = await fetchForSource(source);
    const count = await upsertArticles(db, source.id, items);
    await markOk(source.id);
    return { slug: source.slug, count, ok: true };
  } catch (err) {
    await markError(source, err);
    console.warn(`[ingest] ${source.slug} failed: ${err instanceof Error ? err.message : err}`);
    return { slug: source.slug, count: 0, ok: false };
  }
}

/** Run one ingestion pass over all enabled sources of the given kinds. */
export async function ingestAll(kinds?: Array<"rss" | "hn" | "devto">): Promise<void> {
  const where = kinds
    ? sql`enabled = true AND status = 'approved' AND kind IN (${sql.join(kinds.map((k) => sql`${k}`), sql`, `)})`
    : sql`enabled = true AND status = 'approved'`;
  const enabled = await db.select().from(sources).where(where);

  const started = Date.now();
  const results = await Promise.all(
    enabled.map((s) => sourceConcurrency(() => ingestSource(s))),
  );

  const total = results.reduce((a, r) => a + r.count, 0);
  const failed = results.filter((r) => !r.ok).length;
  console.log(
    `[ingest] ${results.length} sources, ${total} articles upserted, ${failed} failed in ${Date.now() - started}ms`,
  );
}
