import { createHash, timingSafeEqual } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../env";

// Compare via fixed-length SHA-256 digests: constant-time, and neither the
// result nor the timing reveals anything about the key — not even its length.
function secureEqual(a: string, b: string): boolean {
  const ah = createHash("sha256").update(a).digest();
  const bh = createHash("sha256").update(b).digest();
  return timingSafeEqual(ah, bh);
}

// Optional IP allowlist for single-operator / self-host lockdown. Empty = open
// to anyone presenting a valid key (the key is the gate). Requires TRUST_PROXY
// when running behind a reverse proxy so req.ip is the real client.
const allowedIps = env.ADMIN_ALLOWED_IPS
  ? new Set(
      env.ADMIN_ALLOWED_IPS.split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    )
  : null;

// Best-effort in-memory brute-force throttle: after MAX_FAILS bad keys from one
// IP within WINDOW_MS, lock it out until the window rolls. Pairs with the global
// rate limit and a strong key. Single process — resets on restart, which is fine.
const FAILS = new Map<string, { n: number; first: number }>();
const MAX_FAILS = 20;
const WINDOW_MS = 15 * 60_000;

function lockedOut(ip: string, now: number): boolean {
  const rec = FAILS.get(ip);
  if (!rec) return false;
  if (now - rec.first > WINDOW_MS) {
    FAILS.delete(ip);
    return false;
  }
  return rec.n >= MAX_FAILS;
}

function recordFail(ip: string, now: number): number {
  const rec = FAILS.get(ip);
  if (!rec || now - rec.first > WINDOW_MS) {
    FAILS.set(ip, { n: 1, first: now });
    return 1;
  }
  rec.n += 1;
  return rec.n;
}

/** onRequest hook that rejects any request without a valid x-admin-key. */
export async function adminGuard(req: FastifyRequest, reply: FastifyReply) {
  const ip = req.ip;
  const now = Date.now();

  if (allowedIps && !allowedIps.has(ip)) {
    req.log.warn({ ip }, "admin: client IP not in ADMIN_ALLOWED_IPS");
    return reply.code(403).send({ error: "forbidden" });
  }

  if (lockedOut(ip, now)) {
    return reply.code(429).send({ error: "too many attempts, try again later" });
  }

  const key = req.headers["x-admin-key"];
  if (typeof key !== "string" || !secureEqual(key, env.ADMIN_API_KEY)) {
    const attempts = recordFail(ip, now);
    req.log.warn({ ip, attempts }, "admin: invalid key");
    return reply.code(401).send({ error: "unauthorized" });
  }

  // Valid key — clear any accumulated failures for this IP.
  FAILS.delete(ip);
}
