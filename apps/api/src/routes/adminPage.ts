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

export async function adminPageRoutes(app: FastifyInstance) {
  app.get("/admin", async (_req, reply) => {
    return reply.type("text/html").send(html);
  });
}
