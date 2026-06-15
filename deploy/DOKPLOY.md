# Deploying Yomi on Dokploy

You already run Dokploy, so use it — it's a better fit than the raw Caddy stack:
Dokploy's built-in **Traefik** handles TLS + routing, its **managed databases**
give you a connection string + **scheduled backups to S3/R2** for free, and you
get deploy-on-git-push, env management, and logs out of the box.

Because Traefik already owns ports 80/443, **do not deploy the Caddy stack**
(`docker-compose.prod.yml`) on a Dokploy host — they'd collide. Use one of the
two paths below.

Both paths are safe to redeploy repeatedly: the container's start command runs
`migrate → seed → server`, migrations are tracked once each, and the seed uses
`onConflictDoUpdate`, so nothing duplicates on redeploy.

---

## Path A — Application + managed Postgres (recommended)

The most Dokploy-native option; gives you Dokploy's database backups.

1. **Create the database.** Dokploy → _Databases_ → **PostgreSQL 16**. Note the
   internal connection string (host is the service name on Dokploy's network).
   Enable **scheduled backups** to an S3/R2 bucket (replaces `deploy/backup.sh`).
2. **Create the app.** Dokploy → _Application_ → connect the GitHub repo
   `ummahrican/yomi`, branch `main`.
   - Build type: **Dockerfile**
   - Dockerfile path: `apps/api/Dockerfile`
   - Build context / root: repo root (`.`) — required so the pnpm workspace +
     `packages/shared` are present in the image.
3. **Environment** (Application → _Environment_):
   ```
   NODE_ENV=production
   DATABASE_URL=postgres://USER:PASSWORD@<dokploy-pg-host>:5432/DB   # from step 1
   ADMIN_API_KEY=<openssl rand -hex 32>     # REQUIRED — boot fails on the default
   CORS_ORIGIN=*                            # correct: extension Origin is chrome-extension://
   GRAVITY=1.6
   SOURCE_APPROVE_VOTES=10
   INGEST_ENABLED=true
   INGEST_CONTACT_URL=https://github.com/ummahrican/yomi
   ```
4. **Domain.** Application → _Domains_ → add `api.<yourdomain>`, container port
   **3000**, enable HTTPS (Let's Encrypt). Point the DNS A record at the Dokploy
   host first so the cert can issue.
5. **Deploy.** Hit Deploy. Verify: `curl https://api.<yourdomain>/health` →
   `{"status":"ok",...}`. Admin dashboard at `https://api.<yourdomain>/admin`.

## Path B — Compose (single self-contained stack)

Use `docker-compose.dokploy.yml` if you'd rather keep Postgres inside the stack.

1. Dokploy → _Compose_ → connect the repo, set compose path to
   `docker-compose.dokploy.yml`.
2. Set the env vars (`POSTGRES_USER/PASSWORD/DB`, `ADMIN_API_KEY`,
   `INGEST_CONTACT_URL`, …) in the _Environment_ tab.
3. _Domains_ → map `api.<yourdomain>` → service **api**, port **3000**, HTTPS on.
4. Deploy; verify `/health` as above. For backups, either enable a Dokploy
   volume/DB backup or run `deploy/backup.sh` against the `db` container.

---

## After either path
- Build + submit the extension with `VITE_API_BASE_URL=https://api.<yourdomain>`
  and tighten `host_permissions` to that origin (see PRODUCTION_READINESS P0.5).
- Enable Dokploy's database backup schedule (Path A) or wire `deploy/backup.sh`
  (Path B) — and confirm backups land **off-box** (S3/R2), not just on the host.
- Auto-deploy: enable Dokploy's GitHub webhook so pushes to `main` redeploy.
