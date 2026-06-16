import { sql } from "drizzle-orm";
import { db } from "../db/client";
import { devices } from "../db/schema";
import { env } from "../env";

/** Record a device id (anonymous). Upserts last_seen. Best-effort. */
export async function touchDevice(deviceId: string): Promise<void> {
  try {
    await db
      .insert(devices)
      .values({ deviceId })
      .onConflictDoUpdate({ target: devices.deviceId, set: { lastSeen: sql`now()` } });
  } catch {
    /* device registration is best-effort; never block the request */
  }
}

/**
 * Weighted vote demand per source, for the admin moderation queue.
 *
 * A vote only counts if its device is "established" — i.e. plausibly a real,
 * returning user rather than one of a burst of freshly-minted UUIDs. A device
 * qualifies if ANY of:
 *   - it is at least VOTE_TRUST_MIN_AGE_HOURS old (first_seen), OR
 *   - it came back in a later session (last_seen well after first_seen), OR
 *   - it has genuine engagement: an upvote on an article, OR
 *   - it has previously voted on an already-approved source.
 *
 * Sybil bursts (N random UUIDs created and voted in one go) satisfy none of
 * these, so they contribute ~0 weighted demand. Returns a map of sourceId ->
 * weighted vote count. Raw counts are still tracked on sources.votes.
 */
export async function weightedVotesBySource(): Promise<Map<number, number>> {
  const minAgeHours = env.VOTE_TRUST_MIN_AGE_HOURS;
  const res = await db.execute<{ source_id: number; weighted: string }>(sql`
    SELECT sv.source_id AS source_id,
           count(*) FILTER (WHERE
                d.first_seen <= now() - (${minAgeHours} || ' hours')::interval
             OR d.last_seen  >= d.first_seen + interval '30 minutes'
             OR EXISTS (SELECT 1 FROM upvote_events ue WHERE ue.device_id = d.device_id)
             OR EXISTS (
                  SELECT 1 FROM source_votes sv2
                  JOIN sources s2 ON s2.id = sv2.source_id
                  WHERE sv2.device_id = d.device_id AND s2.status = 'approved'
                )
           ) AS weighted
    FROM source_votes sv
    JOIN devices d ON d.device_id = sv.device_id
    GROUP BY sv.source_id
  `);
  const map = new Map<number, number>();
  for (const r of res.rows) map.set(Number(r.source_id), Number(r.weighted));
  return map;
}
