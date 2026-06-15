import { sql } from "drizzle-orm";
import { db } from "../db/client";
import { devices } from "../db/schema";

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

/** How many votes a community source needs to auto-approve:
 *  a majority of all known users (>50%), but never fewer than `floor`. */
export async function approvalThreshold(floor: number): Promise<number> {
  const res = await db.execute<{ n: number }>(sql`SELECT count(*)::int AS n FROM devices`);
  const total = Number(res.rows[0]?.n ?? 0);
  return Math.max(floor, Math.floor(total / 2) + 1);
}
