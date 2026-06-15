import { createHash } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  SyncPullResponseSchema,
  SyncPullSchema,
  SyncPushResponseSchema,
  SyncPushSchema,
} from "@daily-alt/shared";
import { db } from "../db/client";
import { syncBlobs } from "../db/schema";

// The account id is the hash of the client's auth token. Only a client that
// knows the token (derived from the user's recovery phrase) can address the row.
// The server never sees the phrase or the encryption key, and the payload is
// ciphertext it cannot read.
function accountIdFor(authToken: string): string {
  return createHash("sha256").update(authToken).digest("hex");
}

export async function syncRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.route({
    method: "POST",
    url: "/api/sync/pull",
    config: { rateLimit: { max: 120, timeWindow: "1 minute" } },
    schema: { body: SyncPullSchema, response: { 200: SyncPullResponseSchema } },
    handler: async (req) => {
      const accountId = accountIdFor(req.body.authToken);
      const [row] = await db
        .select({ payload: syncBlobs.payload, version: syncBlobs.version })
        .from(syncBlobs)
        .where(eq(syncBlobs.accountId, accountId))
        .limit(1);
      return row ? { payload: row.payload, version: row.version } : { payload: null, version: 0 };
    },
  });

  typed.route({
    method: "POST",
    url: "/api/sync/push",
    config: { rateLimit: { max: 120, timeWindow: "1 minute" } },
    schema: { body: SyncPushSchema, response: { 200: SyncPushResponseSchema } },
    handler: async (req) => {
      const { authToken, payload, baseVersion } = req.body;
      const accountId = accountIdFor(authToken);

      const [existing] = await db
        .select({ version: syncBlobs.version, payload: syncBlobs.payload })
        .from(syncBlobs)
        .where(eq(syncBlobs.accountId, accountId))
        .limit(1);

      // Optimistic concurrency: if the server moved on, tell the client to
      // pull + merge + retry (CRDT merge is conflict-free).
      if (existing && existing.version !== baseVersion) {
        return { ok: false, conflict: true, version: existing.version, payload: existing.payload };
      }

      const nextVersion = (existing?.version ?? 0) + 1;
      await db
        .insert(syncBlobs)
        .values({ accountId, payload, version: nextVersion })
        .onConflictDoUpdate({
          target: syncBlobs.accountId,
          set: { payload, version: nextVersion, updatedAt: sql`now()` },
        });

      return { ok: true, version: nextVersion };
    },
  });
}
