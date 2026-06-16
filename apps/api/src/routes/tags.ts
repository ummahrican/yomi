import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { sql } from "drizzle-orm";
import { TagsResponseSchema } from "@daily-alt/shared";
import { db } from "../db/client";

interface TagCount {
  name: string;
  count: number;
}

let cache: { at: number; data: TagCount[] } | null = null;
const TTL_MS = 10 * 60 * 1000;

export async function tagRoutes(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/api/tags",
    schema: { response: { 200: TagsResponseSchema } },
    handler: async () => {
      if (cache && Date.now() - cache.at < TTL_MS) return { tags: cache.data };

      // Unnest tags over recent articles from live sources and count, top 40.
      // Joins sources so a rejected/disabled source's tags don't linger here.
      const result = await db.execute(sql`
        SELECT tag AS name, count(*)::int AS count
        FROM articles a
        JOIN sources s ON s.id = a.source_id,
             unnest(a.tags) AS tag
        WHERE a.published_at > now() - interval '45 days'
          AND s.status = 'approved' AND s.enabled = true
        GROUP BY tag
        ORDER BY count DESC
        LIMIT 40
      `);
      const rows = result.rows as Array<{ name: string; count: number }>;
      const data: TagCount[] = rows.map((r) => ({ name: r.name, count: Number(r.count) }));
      cache = { at: Date.now(), data };
      return { tags: data };
    },
  });
}
