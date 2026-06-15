import { timingSafeEqual } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../env";

function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** onRequest hook that rejects any request without a valid x-admin-key. */
export async function adminGuard(req: FastifyRequest, reply: FastifyReply) {
  const key = req.headers["x-admin-key"];
  if (typeof key !== "string" || !constantTimeEqual(key, env.ADMIN_API_KEY)) {
    return reply.code(401).send({ error: "unauthorized" });
  }
}
