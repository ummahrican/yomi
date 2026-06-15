import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  FeedQuerySchema,
  FeedResponseSchema,
  type FeedItem,
} from "@daily-alt/shared";
import { queryOrganic } from "../feed/query";
import {
  getActiveSponsored,
  isSponsoredSlot,
  pickWeighted,
  toSponsoredItem,
} from "../feed/sponsored";
import { decodeCursor, encodeCursor } from "../lib/cursor";

export async function feedRoutes(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/api/feed",
    schema: {
      querystring: FeedQuerySchema,
      response: { 200: FeedResponseSchema },
    },
    handler: async (req) => {
      const { limit, tag, q, sources } = req.query;
      const offset = decodeCursor(req.query.cursor)?.n ?? 0;
      const csv = (v?: string) =>
        v ? v.split(",").map((s) => s.trim()).filter(Boolean) : undefined;
      const sourceSlugs = csv(sources);
      const mutedTags = csv(req.query.mutedTags);
      const mutedSources = csv(req.query.mutedSources);

      const organic = await queryOrganic({
        limit,
        offset,
        tag,
        q,
        sourceSlugs,
        mutedTags,
        mutedSources,
      });

      const nextCursor =
        organic.length === limit ? encodeCursor({ n: offset + organic.length }) : null;

      // Skip ads on explicit search or single-source browse (clean result set).
      const items: FeedItem[] = [];
      if (q || sourceSlugs?.length) {
        items.push(...organic);
      } else {
        const pool = [...(await getActiveSponsored(tag))];
        organic.forEach((article, i) => {
          if (isSponsoredSlot(offset + i) && pool.length > 0) {
            const pick = pickWeighted(pool);
            if (pick) {
              items.push(toSponsoredItem(pick));
              // Avoid repeating the same ad within a page until the pool cycles.
              const idx = pool.findIndex((p) => p.id === pick.id);
              if (idx >= 0 && pool.length > 1) pool.splice(idx, 1);
            }
          }
          items.push(article);
        });
      }

      return { items, nextCursor };
    },
  });
}
