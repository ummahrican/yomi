import { eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { EventBodySchema, EventResponseSchema } from "@daily-alt/shared";
import { db } from "../db/client";
import { articles, sponsoredPosts, upvoteEvents } from "../db/schema";
import { touchDevice } from "../lib/devices";

export async function eventRoutes(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/api/events",
    // Tighter rate limit on this counter-mutating route (see server.ts config).
    config: { rateLimit: { max: 120, timeWindow: "1 minute" } },
    schema: {
      body: EventBodySchema,
      response: { 200: EventResponseSchema },
    },
    handler: async (req) => {
      const { type, targetType, targetId, deviceId } = req.body;
      void touchDevice(deviceId);

      if (targetType === "sponsored") {
        const col = type === "click" ? sponsoredPosts.clicks : sponsoredPosts.impressions;
        // upvote on a sponsored card is meaningless; treat as impression no-op.
        if (type !== "upvote") {
          await db
            .update(sponsoredPosts)
            .set({ [type === "click" ? "clicks" : "impressions"]: sql`${col} + 1` })
            .where(eq(sponsoredPosts.id, targetId));
        }
        return { ok: true };
      }

      // targetType === "article"
      if (type === "upvote") {
        const inserted = await db
          .insert(upvoteEvents)
          .values({ articleId: targetId, deviceId })
          .onConflictDoNothing();

        if ((inserted.rowCount ?? 0) > 0) {
          const [row] = await db
            .update(articles)
            .set({ upvotes: sql`${articles.upvotes} + 1` })
            .where(eq(articles.id, targetId))
            .returning({ upvotes: articles.upvotes });
          return { ok: true, upvotes: row?.upvotes };
        }
        const [row] = await db
          .select({ upvotes: articles.upvotes })
          .from(articles)
          .where(eq(articles.id, targetId))
          .limit(1);
        return { ok: true, upvotes: row?.upvotes };
      }

      // click / impression on an article
      if (type === "click") {
        await db
          .update(articles)
          .set({ clicks: sql`${articles.clicks} + 1` })
          .where(eq(articles.id, targetId));
      }
      return { ok: true };
    },
  });
}
