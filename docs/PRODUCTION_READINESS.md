# Yomi — Production-Readiness Audit & Launch Plan

_Last updated: 2026-06-14 · Target host: single small VPS · Budget: <$20/mo · Ethos: privacy-first, no surveillance._

This is the checklist to take Yomi from "works locally" to "live and submitted to the stores." Items are tagged **P0** (blocks launch), **P1** (do within the first weeks), **P2** (scale / nice-to-have). Each has _why · action · effort_. Items marked **✅ DONE (this session)** are already implemented in the repo.

## 0. Current state (verified)

- `pnpm install`, `pnpm -r typecheck`, `pnpm -r build`, and the Firefox build all pass with **zero errors**. The toolchain is healthy.
- Architecture matches the privacy claims: stateless-about-users API, constant-time admin auth, E2E-encrypted sync storing only ciphertext + opaque ids, on-device personal data.
- The gaps are operational (deploy, secrets, monitoring, backups), a couple of real security holes (SSRF, weak default admin key), and store-submission blockers (icons, hosted privacy policy, listing assets).

---

## P0 — Blocks launch

### P0.1 — Weak default admin key ✅ DONE
- **Why:** `ADMIN_API_KEY` defaulted to `change-me`; a deploy that forgot to override it exposed campaign + source moderation to anyone.
- **Action (done):** `apps/api/src/env.ts` now reads `NODE_ENV` and **throws on boot** if `NODE_ENV=production` and the key is still `change-me`. The Dockerfile already sets `NODE_ENV=production`, so the container refuses to start without a real key.
- **You must still:** generate the key (`openssl rand -hex 32`) and put it in `.env.production`.

### P0.2 — SSRF via community feed submission ✅ DONE
- **Why:** `POST /api/sources` makes the server fetch a user-supplied URL. With no filtering, a submitter could hit `http://169.254.169.254/` (cloud metadata), `localhost`, or RFC1918 hosts.
- **Action (done):** new `apps/api/src/lib/ssrf.ts` (`assertPublicUrl`) resolves the host and rejects loopback / private / link-local / CGNAT / metadata / non-http(s) targets; wired into `fetchFeedMeta`. Verified against a block/allow test matrix.
- **Residual (P1):** rss-parser follows redirects itself, so a feed that 30x-redirects to an internal host can still bypass the pre-check. Close it by fetching the body via `fetchWithTimeout` with `redirect: "manual"`, re-checking each hop, then `parser.parseString(body)`. ~1–2h.

### P0.3 — Deploy the API + Postgres ✅ CONFIG DONE / you run it
- **Why:** nothing is deployed yet.
- **Action (done):** you already run **Dokploy**, so that's the path — `docker-compose.dokploy.yml` + **`deploy/DOKPLOY.md`** (Traefik does TLS/routing; Dokploy-managed Postgres gives free scheduled backups). The raw `docker-compose.prod.yml` (Caddy auto-TLS + `deploy/Caddyfile` + `deploy/backup.sh`) is the **no-PaaS fallback** for a bare VPS — don't run it on a Dokploy host (Traefik already owns 80/443).
- **Verified safe to redeploy:** `migrate-and-start` runs migrate→seed→server; migrations are tracked once each and the seed is `onConflictDoUpdate`, so redeploys don't duplicate data.
- **Effort:** ~1h in Dokploy incl. DNS.

### P0.4 — Domain + DNS
- **Why:** stores require an HTTPS API origin and a hosted privacy-policy URL; Caddy needs a hostname for its cert.
- **Action:** register one cheap domain (~$10/yr; Namecheap/Porkbun/Cloudflare). Suggest `yomi.<tld>`; point `api.<domain>` (A record) at the VPS IP. Use `<domain>` root or GitHub Pages for the privacy policy + a one-page landing.
- **Effort:** 30 min. **Cost:** ~$10/yr (the only unavoidable recurring cost besides the VPS).

### P0.5 — Bake the production API URL into the extension build
- **Why:** the extension calls `VITE_API_BASE_URL`; today it points at `http://localhost:3000`, and `host_permissions` are localhost-only. A store build pointing at localhost is dead on install.
- **Action (tooling ✅):** `wxt.config.ts` now derives `host_permissions` from `VITE_API_BASE_URL`, and the `zip:prod` script builds both targets. Just run `VITE_API_BASE_URL=https://api.<domain> pnpm --filter @daily-alt/extension zip:prod` — the prod origin is baked in and the host permission auto-tightens to it. Localhost stays the default for local work.
- **Effort:** 30 min. **Note:** changing the API origin later forces a new extension release, so lock the domain first.

### P0.6 — App icons ✅ DONE
- **Why:** no icon assets existed; both stores reject without them and Chrome shows a puzzle-piece.
- **Action (done):** dependency-free generator `apps/extension/scripts/generate-icons.mjs` (`pnpm icons`) renders 16/32/48/128/512 PNGs into `public/icon/`, wired into the manifest; both target builds include them. Regenerate any time you change the mark.
- **You may still:** want a designer to replace the placeholder mark before a big launch — but it is store-valid today.

### P0.7 — LICENSE file ✅ DONE
- **Why:** README + package.json declare MIT but no `LICENSE` existed — for an "open" project that's a credibility + legal gap.
- **Action (done):** MIT `LICENSE` added at repo root.

### P0.8 — Hosted privacy policy (store requirement)
- **Why:** Chrome Web Store and AMO both **require** a public privacy-policy URL. `PRIVACY.md` exists but isn't hosted.
- **Action:** publish `PRIVACY.md` via **GitHub Pages** (free) or serve it from `https://<domain>/privacy`. Add the URL to both store listings and the extension's options page. The policy already accurately describes the no-tracking model — keep it truthful (stores audit MV3 data claims).
- **Effort:** 30 min. **Cost:** $0.

### P0.9 — Store developer accounts
- **Why:** can't submit without them.
- **Action:** register **Chrome Web Store** developer account (one-time **$5**) and **Mozilla AMO** (free). Use a dedicated email. An LLC is **not** required to publish; you can list as an individual developer and add an entity later for sponsor invoicing.
- **Effort:** 30 min. **Cost:** $5 one-time.

---

## P1 — First weeks

### P1.1 — Error monitoring
- **Why:** you need to know when ingestion breaks or the API 500s, without polling logs.
- **Action:** add **Sentry** (free tier: 5k errors/mo) via `@sentry/node` in `server.ts` + a Fastify `setErrorHandler`. Privacy: disable PII capture (`sendDefaultPii: false`), scrub request bodies — consistent with the ethos. Alternative if you want zero third-parties: self-host **GlitchTip** (Sentry-compatible) on the same VPS.
- **Effort:** 2–3h. **Cost:** $0.

### P1.2 — Structured logging + a global error/404 handler
- **Why:** no `setErrorHandler`/`setNotFoundHandler` today; ingestion uses raw `console.log`.
- **Action:** add `app.setErrorHandler` (return sanitized JSON, log the cause) and `setNotFoundHandler`. Set pino level via env (`LOG_LEVEL`), and in prod ship logs through Caddy/Docker's json driver or `docker compose logs`. Pino already redacts nothing sensitive because no PII is logged — keep it that way.
- **Effort:** 2h.

### P1.3 — Database backups ✅ SCRIPT DONE / you schedule it
- **Why:** a single VPS disk is a single point of failure; managed Postgres' big advantage is automated backups, so you must replicate that.
- **Action:** on **Dokploy with a managed Postgres (Path A)**, just enable Dokploy's **scheduled database backups to S3/R2** in the DB settings — that's the whole job, and it lands off-box by default. The repo's `deploy/backup.sh` (nightly `pg_dump | gzip`, prunes >14 days) is for the bare-VPS / Compose path; if you use it, add the cron from its header **and** sync `backups/` off-box (restic/rclone to Backblaze B2 ~$6/TB-mo or Cloudflare R2 10GB-free). A backup on the same disk is not a backup.
- **Effort:** 1h. **Cost:** ~$0–1/mo.

### P1.4 — Rate-limit store is per-process
- **Why:** `@fastify/rate-limit` uses an in-memory store; limits reset on restart and don't hold across replicas. On one VPS process this is _acceptable for launch_, but it won't survive horizontal scaling.
- **Action:** fine to defer while single-process. When you add replicas, back it with Redis (`@fastify/rate-limit` + `rate-limit-redis`). Document as P2 trigger.
- **Effort:** defer. **Priority:** P1-watch / P2-do.

### P1.5 — Sybil-resistant community approval
- **Why:** auto-approval threshold = majority of self-reported anonymous `deviceId`s (client-generated UUIDs). A malicious client can inflate both votes and the denominator.
- **Action:** keep auto-approve but treat it as _surfacing_, not _publishing_: (a) require admin confirmation before an auto-approved source actually starts ingesting at launch scale, OR (b) add lightweight proof-of-work / per-IP-bucket vote caps. Pair with the moderation pipeline (below). Don't over-engineer pre-traffic.
- **Effort:** 2–4h. Revisit once you have real submission volume.

### P1.6 — Content-moderation pipeline for submissions
- **Why:** community-submitted feeds are an abuse/legal surface (spam, malware-y blogs, hateful content). Needed before you publicize the "submit a source" feature widely.
- **Action (phased, ethos-aligned):**
  1. **Domain blocklist + Google Safe Browsing** lookup on submit (free API) — reject known-bad domains/URLs at `POST /api/sources`.
  2. **Report/flag** endpoint + a `reports` table; surface counts in the existing `/admin` dashboard's source queue.
  3. **Admin queue:** keep auto-approve gated behind admin confirm (P1.5) until volume justifies automation.
  4. **AI classifier (later):** a cheap Claude Haiku call to triage submitted feed titles/descriptions into allow/needs-review/reject. Defer until submission volume warrants it.
- **Effort:** phase 1+2 ≈ 1 day; AI triage later.

### P1.7 — Tighten CORS understanding (no code change)
- **Why:** default `CORS_ORIGIN=*` looks alarming but is **correct here**: the read API has no cookies/credentials, and the extension's `Origin` is `chrome-extension://<id>` which a domain allowlist can't match. Forcing a domain would break the extension.
- **Action:** leave `*`; documented in `.env.production.example`. Revisit only if you add an authenticated, cookie-based surface (you shouldn't, per ethos).

---

## P2 — Scale / polish

- **P2.1 Separate ingestion worker.** Today the cron runs in-process. At scale (many sources, slow feeds) split it into its own container/process sharing the DB, so a slow ingest can't affect API latency. Trigger: API p95 latency rising during ingest windows.
- **P2.2 Image hotlinking / proxy policy.** Cards load article/og images directly from third-party origins (no host permission needed, but it leaks the user's IP to those origins on every new tab). For a privacy-first product, consider a caching image proxy on the API (or Cloudflare) so the browser never contacts publisher image hosts. Meaningful ethos win; moderate effort. Document the trade-off either way.
- **P2.3 CI ✅ DONE.** `.github/workflows/ci.yml` runs install + typecheck + dual-target build + packages zips as artifacts on push/PR. Add a deploy step (SSH `docker compose pull/up`) once you're comfortable.
- **P2.4 Tests.** No tests exist. Add a thin layer first where bugs are costly: ranking math, canonical-URL dedup, the CRDT merge, and the SSRF guard. Vitest fits the stack.
- **P2.5 MV3-for-Firefox.** README says "MV3 for Chromium+Firefox" but WXT emits **MV2** for Firefox. Either fix the doc or set WXT to target Firefox MV3 (AMO accepts both today; MV2 is fine for launch). Doc fix is 5 min.
- **P2.6 Health/uptime checks.** Point a free uptime monitor (UptimeRobot / BetterStack free) at `https://api.<domain>/health`.

---

## Deployment

**Using Dokploy (your setup):** follow **`deploy/DOKPLOY.md`** — Application +
managed Postgres (recommended) or the `docker-compose.dokploy.yml` Compose path.
Skip the raw-VPS runbook below.

## Deployment runbook — bare VPS fallback (no Dokploy, ~1–2h)

**Provision (cheapest that comfortably fits):**
- Hetzner CX22 (2 vCPU / 4GB, ~€4.5/mo) or DigitalOcean/Vultr $6 (1GB). 1GB works; 2GB+ gives Postgres breathing room. Pick a region near your audience.
- Ubuntu 22.04+. Create a non-root sudo user, enable the firewall: allow 22/80/443 only (`ufw allow OpenSSH; ufw allow 80; ufw allow 443; ufw enable`). Disable password SSH (key-only). Optional: `fail2ban`.

**Deploy:**
```bash
# on the VPS
sudo apt update && sudo apt install -y docker.io docker-compose-plugin git
sudo usermod -aG docker $USER && newgrp docker
git clone https://github.com/ummahrican/yomi /opt/yomi && cd /opt/yomi
cp .env.production.example .env.production
# edit .env.production: API_DOMAIN, POSTGRES_PASSWORD (openssl rand -hex 24),
#   ADMIN_API_KEY (openssl rand -hex 32), INGEST_CONTACT_URL
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```
- DNS: A record `api.<domain>` → VPS IP **before** first boot so Caddy can get its cert.
- The API container runs `migrate-and-start` (applies migrations + seed, then boots). Verify: `curl https://api.<domain>/health`.
- Admin dashboard: `https://api.<domain>/admin`, paste the `ADMIN_API_KEY`.

**Backups:** add the cron from `deploy/backup.sh`'s header and wire off-box sync (P1.3).

**Updates:** `git pull && docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build`.

---

## Store-submission readiness

### Chrome Web Store
- **Account:** $5 one-time. **Privacy:** complete the data-use disclosure — you collect **no** user data; declare the single "Storage" permission justification ("save the user's feed preferences locally"). Justify `host_permissions` (the API origin) as "fetch the article feed."
- **Assets required:** 128×128 store icon (have it), at least 1 (ideally 3–5) **1280×800 or 640×400** screenshots, a 440×280 small promo tile (optional but boosts placement). Listing copy below.
- **Review note:** MV3 + minimal permissions + no remote code = fast review. Be ready to explain the new-tab override (chrome flags this for review; it's allowed when it's the core feature, which it is).

### Firefox AMO
- **Account:** free. Upload the `firefox-mv2` zip (`pnpm --filter @daily-alt/extension zip:firefox`). AMO does source-code review for minified code — the build is from public source, so link the repo. Same icons/screenshots/privacy-URL.

### Listing copy (draft — refine per ASO in DISTRIBUTION.md)
- **Name:** `Yomi — Tech News on Every New Tab`
- **Summary (≤132 chars):** "A clean, privacy-first feed of the latest dev articles on every new tab. No accounts, no tracking. Open source."
- **Description (opening):** "Yomi turns every new tab into a calm, fast feed of the best tech writing — aggregated from hundreds of developer blogs, Hacker News, and DEV. Privacy-first by design: no account, no tracking pixels, no behavioral profile. Your bookmarks, reading history, and preferences never leave your device. Open source and self-hostable."
- Then bullet features (ranking, bookmarks/streaks, dark mode, keyboard shortcuts, optional E2E-encrypted sync via a recovery phrase, community-curated sources) and a link to the privacy policy + GitHub.

### Screenshots to capture (5)
1. The new-tab feed (dark mode, populated). 2. A card hover / upvote + bookmark. 3. The reader modal with HN comments. 4. Settings → privacy/clear-data (sells the ethos). 5. Cross-device sync recovery-phrase screen (sells the differentiator).

---

## Cost summary (monthly, at launch)
| Item | Cost |
|---|---|
| VPS (Hetzner CX22 / DO $6) | ~$5–6 |
| Domain | ~$1 (≈$10/yr) |
| Postgres, Caddy/TLS, Sentry/GlitchTip, GitHub Pages, uptime, off-box backups | $0 (free tiers) |
| **Total** | **~$6–7/mo** + $5 one-time Chrome fee |

Comfortably under the <$20/mo budget, with headroom for thousands of DAU before anything needs to scale.
