import { desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  SponsoredCreateSchema,
  SponsoredRowSchema,
  SponsoredUpdateSchema,
} from "@daily-alt/shared";
import { db } from "../db/client";
import { sponsoredPosts, type SponsoredPostRow } from "../db/schema";
import { adminGuard } from "../lib/adminAuth";

function serialize(row: SponsoredPostRow): z.infer<typeof SponsoredRowSchema> {
  return {
    id: row.id,
    advertiser: row.advertiser,
    title: row.title,
    excerpt: row.excerpt,
    imageUrl: row.imageUrl,
    targetUrl: row.targetUrl,
    displaySource: row.displaySource,
    tags: row.tags,
    active: row.active,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt ? row.endsAt.toISOString() : null,
    weight: row.weight,
    impressions: Number(row.impressions),
    clicks: Number(row.clicks),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function adminRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  // Guard every route registered in this plugin.
  app.addHook("onRequest", adminGuard);

  typed.route({
    method: "GET",
    url: "/api/admin/sponsored",
    schema: { response: { 200: z.object({ items: z.array(SponsoredRowSchema) }) } },
    handler: async () => {
      const rows = await db
        .select()
        .from(sponsoredPosts)
        .orderBy(desc(sponsoredPosts.createdAt));
      return { items: rows.map(serialize) };
    },
  });

  typed.route({
    method: "POST",
    url: "/api/admin/sponsored",
    schema: { body: SponsoredCreateSchema, response: { 201: SponsoredRowSchema } },
    handler: async (req, reply) => {
      const b = req.body;
      const [row] = await db
        .insert(sponsoredPosts)
        .values({
          advertiser: b.advertiser,
          title: b.title,
          excerpt: b.excerpt ?? null,
          imageUrl: b.imageUrl ?? null,
          targetUrl: b.targetUrl,
          displaySource: b.displaySource ?? null,
          tags: b.tags,
          active: b.active,
          startsAt: b.startsAt ? new Date(b.startsAt) : new Date(),
          endsAt: b.endsAt ? new Date(b.endsAt) : null,
          weight: b.weight,
        })
        .returning();
      return reply.code(201).send(serialize(row));
    },
  });

  typed.route({
    method: "PATCH",
    url: "/api/admin/sponsored/:id",
    schema: {
      params: z.object({ id: z.coerce.number().int().positive() }),
      body: SponsoredUpdateSchema,
      response: { 200: SponsoredRowSchema, 404: z.object({ error: z.string() }) },
    },
    handler: async (req, reply) => {
      const b = req.body;
      const patch: Partial<typeof sponsoredPosts.$inferInsert> = {};
      if (b.advertiser !== undefined) patch.advertiser = b.advertiser;
      if (b.title !== undefined) patch.title = b.title;
      if (b.excerpt !== undefined) patch.excerpt = b.excerpt ?? null;
      if (b.imageUrl !== undefined) patch.imageUrl = b.imageUrl ?? null;
      if (b.targetUrl !== undefined) patch.targetUrl = b.targetUrl;
      if (b.displaySource !== undefined) patch.displaySource = b.displaySource ?? null;
      if (b.tags !== undefined) patch.tags = b.tags;
      if (b.active !== undefined) patch.active = b.active;
      if (b.startsAt !== undefined) patch.startsAt = new Date(b.startsAt);
      if (b.endsAt !== undefined) patch.endsAt = b.endsAt ? new Date(b.endsAt) : null;
      if (b.weight !== undefined) patch.weight = b.weight;

      const [row] = await db
        .update(sponsoredPosts)
        .set(patch)
        .where(eq(sponsoredPosts.id, req.params.id))
        .returning();
      if (!row) return reply.code(404).send({ error: "not found" });
      return serialize(row);
    },
  });

  typed.route({
    method: "DELETE",
    url: "/api/admin/sponsored/:id",
    schema: {
      params: z.object({ id: z.coerce.number().int().positive() }),
      response: { 200: z.object({ ok: z.boolean() }) },
    },
    handler: async (req) => {
      await db.delete(sponsoredPosts).where(eq(sponsoredPosts.id, req.params.id));
      return { ok: true };
    },
  });
}
