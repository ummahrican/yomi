import { and, eq, gt, isNull, lte, or, sql } from "drizzle-orm";
import type { SponsoredItem } from "@daily-alt/shared";
import { SPONSORED_EVERY, SPONSORED_FIRST_SLOT } from "@daily-alt/shared";
import { db } from "../db/client";
import { sponsoredPosts, type SponsoredPostRow } from "../db/schema";

/** Fetch sponsored posts that are active and within their date window right now. */
export async function getActiveSponsored(tag?: string): Promise<SponsoredPostRow[]> {
  const rows = await db
    .select()
    .from(sponsoredPosts)
    .where(
      and(
        eq(sponsoredPosts.active, true),
        lte(sponsoredPosts.startsAt, sql`now()`),
        or(isNull(sponsoredPosts.endsAt), gt(sponsoredPosts.endsAt, sql`now()`)),
      ),
    );
  if (!tag) return rows;
  // Prefer tag-matched ads when a tag filter is active; fall back to all.
  const matched = rows.filter((r) => r.tags.includes(tag));
  return matched.length > 0 ? matched : rows;
}

/** Weighted-random pick honoring `weight`. Returns null if the pool is empty. */
export function pickWeighted(pool: SponsoredPostRow[]): SponsoredPostRow | null {
  if (pool.length === 0) return null;
  const total = pool.reduce((a, r) => a + Math.max(1, r.weight), 0);
  let roll = Math.random() * total;
  for (const r of pool) {
    roll -= Math.max(1, r.weight);
    if (roll <= 0) return r;
  }
  return pool[pool.length - 1];
}

export function toSponsoredItem(row: SponsoredPostRow): SponsoredItem {
  return {
    type: "sponsored",
    id: row.id,
    promoted: true,
    title: row.title,
    url: row.targetUrl,
    source: { slug: "promoted", name: row.displaySource ?? row.advertiser, iconUrl: null },
    imageUrl: row.imageUrl,
    excerpt: row.excerpt,
    tags: row.tags,
  };
}

/**
 * Decide whether a sponsored card should be spliced in *before* the organic
 * item at the given global organic index (0-based).
 * Cadence: first at SPONSORED_FIRST_SLOT, then every SPONSORED_EVERY thereafter.
 */
export function isSponsoredSlot(globalOrganicIndex: number): boolean {
  if (globalOrganicIndex < SPONSORED_FIRST_SLOT) return false;
  return (globalOrganicIndex - SPONSORED_FIRST_SLOT) % SPONSORED_EVERY === 0;
}
