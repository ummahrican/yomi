# Yomi — the latest in tech on every new tab

An open, community-friendly alternative to daily.dev. A browser extension overrides your
new-tab page with a ranked feed of the latest tech articles, aggregated from hundreds of
developer blogs plus Hacker News and DEV. No accounts, no tracking. Monetized — if you want —
with clearly-labeled sponsored posts.

- **Backend** (`apps/api`): Node + TypeScript + Fastify + Postgres. Pulls RSS/Atom feeds, the
  Hacker News API, and the DEV API; dedupes and ranks them; serves a paginated feed and injects
  sponsored posts.
- **Extension** (`apps/extension`): WXT + React + TypeScript + Tailwind. One codebase builds for
  Chromium (Chrome/Edge/Brave) and Firefox (Manifest V3 / V2). Bookmarks, upvotes, and settings
  live on-device.
- **Shared** (`packages/shared`): zod schemas shared by both — one source of truth for the API
  contract.

## Why this exists

daily.dev is a great product. This is a clean-room, open alternative you can self-host and share
freely. It is not affiliated with daily.dev.

---

## Quick start (local dev)

Prereqs: Node ≥ 20, pnpm, Docker.

```bash
pnpm install
cp .env.example .env          # defaults work for local dev

# 1) Database
pnpm db:up                    # start Postgres (docker compose)
pnpm db:migrate               # create tables
pnpm db:seed                  # insert the ~25 starter sources

# 2) Fill the feed (the dev server also does this on a schedule)
pnpm --filter @daily-alt/api ingest:once

# 3) Run everything
pnpm dev                      # API on :3000 + extension dev (auto-opens a browser)
# or individually:
pnpm api
pnpm ext                      # Chromium
pnpm ext:firefox              # Firefox
```

`pnpm ext` opens a browser with the extension loaded — open a new tab to see the feed. The API
runs a background ingestion cron (HN every 10 min, RSS every 15 min, DEV every 20 min).

> **Note on pnpm:** `pnpm-workspace.yaml` pins `@vitejs/plugin-react` to v4 via `overrides`
> (WXT 0.19 uses Vite 6, but plugin-react 6 requires Vite 7), and lists `esbuild` + `spawn-sync`
> under `onlyBuiltDependencies` so `pnpm install` approves their build scripts and exits 0.
> If you ever see `ERR_PNPM_IGNORED_BUILDS`, run `pnpm approve-builds` — but do **not** leave a
> half-filled `allowBuilds:` block in the workspace file; it suppresses the approval keys.

---

## How it works

### Aggregation
`apps/api/src/ingest` fetches each enabled source (`runner.ts`), normalizes items
(`normalize.ts` — image/excerpt/tags extraction), and upserts them. Dedup is by a canonical-URL
hash (`lib/canonicalUrl.ts`): the same article from RSS and Hacker News collapses to one card and
merges popularity signals. Failing sources are tracked and auto-disabled after repeated errors.

### Ranking
A gravity score with **log-compressed popularity** so one viral HN thread doesn’t bury every blog:

```
P     = ln(1+hn/dev_score) + 1.5·ln(1+comments) + 3·upvotes
score = (P+1)^0.8 / (ageHours+2)^GRAVITY        # GRAVITY tunable via env
```

A window function applies a **per-source decay** (`0.6^(rank-1)`) so the feed interleaves many
sources instead of letting one dominate. See `apps/api/src/feed/query.ts`.

### Sponsored posts (monetization)
The feed assembler splices one promoted card at position 3, then every 8 cards
(`feed/sponsored.ts`). Cards are weighted-random among active posts and rendered with a clear
**“Promoted”** badge. Impressions/clicks are counted via `POST /api/events` using only an
anonymous device id.

Create one:

```bash
ADMIN_API_KEY=change-me node scripts/create-sponsored.mjs \
  --advertiser "Acme" --title "Ship faster with Acme CI" \
  --url "https://acme.com/?ref=yomi" --tags devtools,ci --weight 5
```

(or `POST /api/admin/sponsored` with header `x-admin-key: $ADMIN_API_KEY`).

---

## API

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/health` | liveness |
| GET | `/api/feed?cursor&limit&tag&q&sources&mutedTags&mutedSources` | paginated feed (articles + sponsored) |
| GET | `/api/articles/:id` | single article |
| GET | `/api/tags` | top tags by recent article count |
| POST | `/api/events` | `{type:upvote\|click\|impression, targetType, targetId, deviceId}` |
| GET | `/api/sources?status&deviceId` | list approved/pending community sources |
| POST | `/api/sources` | submit a feed `{feedUrl, deviceId}` (validated) |
| POST | `/api/sources/:id/vote` | `{deviceId}` — auto-approves at `SOURCE_APPROVE_VOTES` |
| POST | `/api/sync/pull` | `{authToken}` → encrypted blob for that anonymous account |
| POST | `/api/sync/push` | `{authToken, payload, baseVersion}` → store ciphertext (optimistic concurrency) |
| GET/POST/PATCH/DELETE | `/api/admin/sponsored` | requires `x-admin-key` |
| GET/PATCH/DELETE | `/api/admin/sources` | moderate community sources (requires `x-admin-key`) |
| GET | `/admin` | password-protected admin dashboard (campaigns + sources) |

## Features beyond the core feed

- **Reading streaks** — tracked in browser **sync** storage (cross-device, survives reinstall); shown as a 🔥 badge.
- **Not interested** — each card's ⋯ menu can hide an article or mute a source/tag. Muted tags/sources are sent as per-request feed filters, so the server **stores no profile**. Manage/unmute them in Settings.
- **Community-voted sources** — anyone can suggest an RSS feed in Settings; it's validated server-side, then auto-approves once it reaches `SOURCE_APPROVE_VOTES` votes (or you approve it in the dashboard).
- **Backup** — Settings → Export/Import a JSON file for an offline copy you control.
- **Anonymous cross-device sync** — Settings → Enable sync mints a **12-word recovery phrase** (no account). From it the client derives an AES-GCM key (encrypts everything on-device) and an auth token (the server keys storage by its hash). Data is merged with a small **CRDT** (LWW bookmarks, grow-only upvotes/reads, LWW settings with max-streak), so multiple devices reconcile without loss. The server stores only **ciphertext it can't read**. Restore on another device by entering the phrase.
- **Video cards** — curated tech YouTube channels are ingested via per-channel RSS and shown as video cards (play overlay, thumbnail, "Watch"). Add more in `sources.seed.ts` with `contentType: "video"`.
- **Read-time** — cards show an estimated "Xm read" (from content length; dev.to provides exact minutes).
- **Keyboard shortcuts** — `/` or ⌘K focus search; `j`/`k` (or arrows) move the selection; `o`/Enter open; `b` bookmark; `u` upvote; `Esc` blur/clear. Plus copy-link on each card and a scroll-to-top button.
- **Admin dashboard** (`/admin`) — paste your `ADMIN_API_KEY` to create/pause/delete sponsored campaigns (with impressions/clicks/CTR) and approve/reject community sources.

### Data & privacy model
Personal/behavioral data (bookmarks, upvotes, read state, streak, muted lists) lives **on-device**. The server is stateless about *you*: it ranks globally and accepts per-request filter params; the only per-device rows it stores are anonymous vote-dedup entries and aggregate ad counters. See [`PRIVACY.md`](./PRIVACY.md).

---

## Deploy

### API + Postgres
Any host that runs a Node service + managed Postgres works (Railway, Render, Fly.io).

1. Provision Postgres and set `DATABASE_URL`.
2. Set env: `ADMIN_API_KEY` (change it!), `CORS_ORIGIN=*`, `GRAVITY` (optional), `INGEST_CONTACT_URL`.
3. Deploy the API. A Dockerfile is provided (build context = repo root):
   ```bash
   docker build -f apps/api/Dockerfile -t yomi-api .
   ```
   Its start command runs migrations + seed, then boots the server with the ingest cron.

### Extension
Point the extension at your deployed API and tighten its host permission:

1. In `apps/extension/wxt.config.ts`, set `host_permissions` to your API origin
   (e.g. `https://api.yourdomain.com/*`).
2. Build with the API URL baked in:
   ```bash
   VITE_API_BASE_URL=https://api.yourdomain.com pnpm --filter @daily-alt/extension zip
   VITE_API_BASE_URL=https://api.yourdomain.com pnpm --filter @daily-alt/extension zip:firefox
   ```
3. Submit:
   - **Chrome Web Store:** upload `.output/*-chrome.zip` (dev account, one-time $5 fee).
   - **Firefox AMO:** upload the Firefox zip + the generated `sources.zip`; include the build
     command above for reviewers.
   - Edge/Brave accept the Chrome package.

Declare the promoted-content/monetization and link [`PRIVACY.md`](./PRIVACY.md) in your listings.

---

## Adding / changing sources

Edit `apps/api/src/ingest/sources.seed.ts` and re-run `pnpm db:seed` (idempotent). Each source is
`{ slug, name, kind: 'rss'|'hn'|'devto', feedUrl? }`. Health (`last_status`, `consecutive_failures`)
is visible in the `sources` table.

## Content & licensing
Yomi stores and shows only **titles, short excerpts, source attribution, and links** — it never
republishes full article bodies. Every card links out to the original publisher. This mirrors the
fair-use posture of Hacker News and similar aggregators. Drop any source that objects.

## License
MIT.
