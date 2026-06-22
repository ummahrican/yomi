import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { FastifyInstance } from "fastify";

// The dashboard is a self-contained static page. It carries no secrets — the
// admin key is entered by the user and kept in their browser's sessionStorage;
// every data call requires that key via the x-admin-key header.
const html = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "..", "admin", "dashboard.html"),
  "utf8",
);

// Locks the page down: no caching of the admin UI, can't be framed
// (clickjacking), and a CSP that confines it to same-origin (the inline
// style/script the dashboard ships are allowed; nothing external loads).
const CSP =
  "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; " +
  "script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'";

export async function adminPageRoutes(app: FastifyInstance) {
  app.get("/admin", async (_req, reply) => {
    return reply
      .type("text/html")
      .header("Cache-Control", "no-store")
      .header("Referrer-Policy", "no-referrer")
      .header("X-Content-Type-Options", "nosniff")
      .header("X-Frame-Options", "DENY")
      .header("Content-Security-Policy", CSP)
      .send(html);
  });
}
