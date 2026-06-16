import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  SourceListItemSchema,
  SourceSubmitSchema,
  SourceVoteResponseSchema,
  SourcesResponseSchema,
} from "@daily-alt/shared";
import { db } from "../db/client";
import { sources, sourceVotes, type SourceRow } from "../db/schema";
import { env } from "../env";
import { fetchFeedMeta } from "../ingest/rss";
import { adminGuard } from "../lib/adminAuth";
import { touchDevice, weightedVotesBySource } from "../lib/devices";

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "source"
  );
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  let n = 1;
  // Loop until a free slug is found (tiny table, fine).
  while (true) {
    const [hit] = await db.select({ id: sources.id }).from(sources).where(eq(sources.slug, slug)).limit(1);
    if (!hit) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

function toListItem(row: SourceRow, voted: boolean): z.infer<typeof SourceListItemSchema> {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    kind: row.kind,
    homepageUrl: row.homepageUrl,
    iconUrl: row.iconUrl,
    status: row.status,
    votes: row.votes,
    voted,
    lastStatus: row.lastStatus,
  };
}

export async function sourceRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  // List sources (approved and/or pending), with this device's vote state.
  typed.route({
    method: "GET",
    url: "/api/sources",
    schema: {
      querystring: z.object({
        status: z.enum(["approved", "pending", "all"]).default("all"),
        deviceId: z.string().uuid().optional(),
      }),
      response: { 200: SourcesResponseSchema },
    },
    handler: async (req) => {
      const { status, deviceId } = req.query;
      const where =
        status === "all"
          ? ne(sources.status, "rejected")
          : eq(sources.status, status);
      const rows = await db
        .select()
        .from(sources)
        .where(where)
        .orderBy(desc(sources.votes), desc(sources.id));

      let votedIds = new Set<number>();
      if (deviceId && rows.length > 0) {
        const votes = await db
          .select({ sourceId: sourceVotes.sourceId })
          .from(sourceVotes)
          .where(
            and(
              eq(sourceVotes.deviceId, deviceId),
              inArray(
                sourceVotes.sourceId,
                rows.map((r) => r.id),
              ),
            ),
          );
        votedIds = new Set(votes.map((v) => v.sourceId));
      }

      return {
        items: rows.map((r) => toListItem(r, votedIds.has(r.id))),
        approveVotes: env.SOURCE_APPROVE_VOTES,
      };
    },
  });

  // Submit a new RSS/Atom feed (community). Validates it actually parses.
  typed.route({
    method: "POST",
    url: "/api/sources",
    config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    schema: {
      body: SourceSubmitSchema,
      response: {
        201: SourceListItemSchema,
        200: SourceListItemSchema,
        400: z.object({ error: z.string() }),
      },
    },
    handler: async (req, reply) => {
      const { feedUrl, deviceId } = req.body;
      void touchDevice(deviceId);

      // Already submitted/known? Return it (idempotent, friendly).
      const [existing] = await db.select().from(sources).where(eq(sources.feedUrl, feedUrl)).limit(1);
      if (existing) {
        const [v] = await db
          .select({ x: sourceVotes.sourceId })
          .from(sourceVotes)
          .where(and(eq(sourceVotes.sourceId, existing.id), eq(sourceVotes.deviceId, deviceId)))
          .limit(1);
        return reply.code(200).send(toListItem(existing, !!v));
      }

      // Validate the feed parses and has real content.
      let meta: Awaited<ReturnType<typeof fetchFeedMeta>>;
      try {
        meta = await fetchFeedMeta(feedUrl);
      } catch {
        return reply.code(400).send({ error: "Could not fetch or parse that feed URL." });
      }
      if (meta.itemCount < 3) {
        return reply.code(400).send({ error: "That feed has too few articles to be useful." });
      }

      const name = (req.body.name ?? meta.title ?? new URL(feedUrl).hostname).trim().slice(0, 80);
      const homepageUrl =
        req.body.homepageUrl ?? meta.link ?? new URL(feedUrl).origin;
      const slug = await uniqueSlug(slugify(name));
      const iconUrl = `https://www.google.com/s2/favicons?domain=${new URL(homepageUrl).hostname}&sz=64`;

      const [row] = await db
        .insert(sources)
        .values({
          slug,
          name,
          kind: "rss",
          feedUrl,
          homepageUrl,
          iconUrl,
          status: "pending",
          submittedByDevice: deviceId,
          votes: 1,
        })
        .returning();
      // Submitter's own vote.
      await db.insert(sourceVotes).values({ sourceId: row.id, deviceId }).onConflictDoNothing();

      return reply.code(201).send(toListItem(row, true));
    },
  });

  // Vote for a pending source. Votes are a *demand signal only* — they never
  // auto-publish a source (that requires an admin). See adminSourceRoutes.
  typed.route({
    method: "POST",
    url: "/api/sources/:id/vote",
    config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
    schema: {
      params: z.object({ id: z.coerce.number().int().positive() }),
      body: z.object({ deviceId: z.string().uuid() }),
      response: { 200: SourceVoteResponseSchema, 404: z.object({ error: z.string() }) },
    },
    handler: async (req, reply) => {
      const { id } = req.params;
      const { deviceId } = req.body;
      void touchDevice(deviceId);

      const [src] = await db.select().from(sources).where(eq(sources.id, id)).limit(1);
      if (!src) return reply.code(404).send({ error: "not found" });

      const inserted = await db
        .insert(sourceVotes)
        .values({ sourceId: id, deviceId })
        .onConflictDoNothing();

      if ((inserted.rowCount ?? 0) === 0) {
        // Already voted — return current state.
        return { ok: true, votes: src.votes, status: src.status };
      }

      // Record the vote (raw tally) but never change status — approval is a
      // human decision in the admin dashboard. This is the core anti-abuse gate:
      // no amount of (even sybil) voting can publish a source on its own.
      const [row] = await db
        .update(sources)
        .set({ votes: src.votes + 1 })
        .where(eq(sources.id, id))
        .returning({ votes: sources.votes, status: sources.status });

      return { ok: true, votes: row.votes, status: row.status };
    },
  });
}

/** Admin moderation of sources (guarded). */
export async function adminSourceRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();
  app.addHook("onRequest", adminGuard);

  typed.route({
    method: "GET",
    url: "/api/admin/sources",
    schema: { response: { 200: SourcesResponseSchema } },
    handler: async () => {
      const [rows, weights] = await Promise.all([
        db.select().from(sources),
        weightedVotesBySource(),
      ]);
      const items = rows.map((r) => ({
        ...toListItem(r, false),
        weightedVotes: weights.get(r.id) ?? 0,
      }));
      // Surface the actionable queue first: pending sources, ordered by real
      // (trust-weighted) demand, then raw votes; everything else after.
      items.sort((a, b) => {
        const ap = a.status === "pending" ? 0 : 1;
        const bp = b.status === "pending" ? 0 : 1;
        if (ap !== bp) return ap - bp;
        if (b.weightedVotes !== a.weightedVotes) return b.weightedVotes - a.weightedVotes;
        return b.votes - a.votes;
      });
      return { items, approveVotes: env.SOURCE_APPROVE_VOTES };
    },
  });

  typed.route({
    method: "PATCH",
    url: "/api/admin/sources/:id",
    schema: {
      params: z.object({ id: z.coerce.number().int().positive() }),
      body: z.object({
        status: z.enum(["approved", "pending", "rejected"]).optional(),
        enabled: z.boolean().optional(),
      }),
      response: { 200: SourceListItemSchema, 404: z.object({ error: z.string() }) },
    },
    handler: async (req, reply) => {
      const patch: Partial<typeof sources.$inferInsert> = {};
      if (req.body.status !== undefined) patch.status = req.body.status;
      if (req.body.enabled !== undefined) patch.enabled = req.body.enabled;
      const [row] = await db
        .update(sources)
        .set(patch)
        .where(eq(sources.id, req.params.id))
        .returning();
      if (!row) return reply.code(404).send({ error: "not found" });
      return toListItem(row, false);
    },
  });

  typed.route({
    method: "DELETE",
    url: "/api/admin/sources/:id",
    schema: {
      params: z.object({ id: z.coerce.number().int().positive() }),
      response: { 200: z.object({ ok: z.boolean() }) },
    },
    handler: async (req) => {
      // Remove votes first (FK), then the source.
      await db.delete(sourceVotes).where(eq(sourceVotes.sourceId, req.params.id));
      await db.delete(sources).where(eq(sources.id, req.params.id));
      return { ok: true };
    },
  });
}
