<div align="center">
  <br>
  <img alt="Yomi" src="apps/extension/public/logo.svg" width="200px">
  <h1>Yomi</h1>
  <strong>The latest in tech on every new tab — open, private, yours. A self-hostable alternative to <a href="https://daily.dev">daily.dev</a>.</strong>
</div>
<br>
<p align="center">
  <img src="https://img.shields.io/github/actions/workflow/status/ummahrican/yomi/ci.yml?branch=main&label=CI&logo=github" alt="CI status">
  <img src="https://img.shields.io/github/license/ummahrican/yomi" alt="License">
  <img src="https://img.shields.io/github/languages/code-size/ummahrican/yomi" alt="GitHub code size in bytes">
  <img src="https://img.shields.io/github/last-commit/ummahrican/yomi" alt="Last commit">
</p>

<p align="center">
  <a href="https://chromewebstore.google.com/detail/yomi-%E2%80%94-latest-in-tech-on/nnndnjginfbedcgielmpfnkecbmipacf"><img src="https://img.shields.io/badge/Add%20to%20Chrome-4285F4?logo=googlechrome&logoColor=white" alt="Add to Chrome"></a>
  <a href="https://addons.mozilla.org/en-US/firefox/addon/yomi/"><img src="https://img.shields.io/badge/Add%20to%20Firefox-FF7139?logo=firefoxbrowser&logoColor=white" alt="Add to Firefox"></a>
</p>


<div align="center">
  <img src="docs/demo.gif" alt="Yomi demo — a ranked tech feed on every new tab" width="100%">
</div>

Yomi is a browser new-tab extension that replaces every new tab with a ranked feed of the latest tech articles — aggregated from hundreds of developer blogs, the [Hacker News](https://news.ycombinator.com) API, and [DEV](https://dev.to). **No accounts, no tracking**: your bookmarks, history, and preferences stay on your device, and the server is stateless about you. It's a clean-room, open alternative to daily.dev (not affiliated) that you can self-host and share freely.

## ✨ Features

- **One ranked feed, many sources** — RSS/Atom blogs, Hacker News, DEV, and curated YouTube channels; canonical-URL de-duplication; log-compressed gravity ranking with per-source diversity decay.
- **Private by architecture** — bookmarks, upvotes, read-state, streaks, and "not interested" live on-device; muted tags/sources are sent as per-request filters, so the server keeps **no behavioral profile**.
- **In-place reader** with live Hacker News comment threads.
- **Anonymous, end-to-end-encrypted sync** — a 12-word recovery phrase derives an on-device AES-GCM key; the server only ever stores ciphertext it can't read. No account, no email.
- **Community-curated sources** — submit and vote on RSS feeds; auto-approve at a majority threshold (admin override in the dashboard).
- **Monetization, if you want it** — clearly-labeled "Promoted" cards (and privacy-respecting ad fill), never surveillance ad networks.
- Dark mode by default, keyboard shortcuts, JSON backup export/import.

## 🧩 Project structure

A pnpm monorepo:

| Package | Stack | Purpose |
| --- | --- | --- |
| `apps/api` | Node · TypeScript · Fastify · Postgres · Drizzle | Ingests + ranks articles, serves the feed, injects sponsored posts, runs the admin dashboard |
| `apps/extension` | WXT · React · TypeScript · Tailwind | One codebase builds the MV3 (Chromium) + MV2 (Firefox) new-tab extension |
| `packages/shared` | zod | Schemas shared by both — one source of truth for the API contract |

## 📖 Prerequisites

In order to run the project you need `node>=20`, `pnpm`, and `docker` (for a local Postgres).

Enable pnpm via corepack: `corepack enable`.

## 🖥️ Local development

To install the application:

```shell
pnpm install
cp .env.example .env          # defaults work for local dev
```

Start Postgres and set up the database:

```shell
pnpm db:up                    # start Postgres via docker compose
pnpm db:migrate               # apply SQL migrations
pnpm db:seed                  # insert the curated starter sources (idempotent)
```

Run everything (API on `:3000`, extension dev server on `:3001`):

```shell
pnpm dev
# or individually:
pnpm api                      # API + background ingestion cron
pnpm ext                      # Chromium
pnpm ext:firefox              # Firefox
```

Then load the unpacked extension (`apps/extension/.output/chrome-mv3`) and open a new tab.

> **pnpm note:** `pnpm-workspace.yaml` pins `@vitejs/plugin-react` to v4 via `overrides` (WXT 0.19 uses Vite 6, but plugin-react 6 needs Vite 7) and lists `esbuild` + `spawn-sync` under `onlyBuiltDependencies` so `pnpm install` exits 0. If you see `ERR_PNPM_IGNORED_BUILDS`, run `pnpm approve-builds` — but don't leave a half-filled `allowBuilds:` block in the workspace file.

### 🧪 Test

A formal test suite is not yet set up (planned: Vitest for the ranking, dedup, CRDT, and SSRF logic). Type safety is enforced across all packages — run:

```shell
pnpm -r typecheck
```

### 📦 Docker builds

The API ships a Dockerfile (build context must be the **repo root** so the workspace + shared package are available):

```shell
docker build -f apps/api/Dockerfile -t yomi-api .
```

Then run it (it applies migrations + seed, then boots the server with the ingest cron):

```shell
docker run -d -p 3000:3000 \
  -e DATABASE_URL="postgres://user:pass@host:5432/yomi" \
  -e ADMIN_API_KEY="$(openssl rand -hex 32)" \
  yomi-api
```

### 🎨 Code linting

Type checking via `tsc` is the source of truth today (`pnpm -r typecheck`). An ESLint/Prettier config isn't committed yet — contributions welcome.

### 🚀 Production deployment

Everything ships through GitHub Actions — no manual uploads. Four workflows cover the whole stack:

| Workflow | Triggers on | What it does |
| --- | --- | --- |
| `ci.yml` | every push / PR | Typecheck + build all packages; build both extension zips |
| `publish-api.yml` | push to `main`, `v*` tags | Build the API image and push to GHCR (`ghcr.io/ummahrican/yomi/api`) tagged `latest`, `<short-sha>`, and semver — the host pulls rather than builds |
| `pages.yml` | push to `main` touching `site/**` | Deploy the landing + privacy site to GitHub Pages |
| `publish-extension.yml` | `v*` tags (or manual dispatch) | Build store-ready zips (API origin baked in) and submit to the Chrome Web Store + Firefox Add-ons via `wxt submit` |

**API host** — deploy with `docker-compose.dokploy.yml` on Dokploy (Traefik handles TLS) or any Docker host. Since CI publishes the image to GHCR, point the host at the registry and let it pull. The GHCR package is private by default: make it public, or give the host a `read:packages` pull credential.

**Cutting an extension release:**

1. Bump `version` in `apps/extension/package.json` (both stores reject a version that's already live).
2. Commit, then tag and push:
   ```shell
   git tag v0.1.2 && git push --tags
   ```
3. The tag triggers `publish-extension.yml`, which submits to **both** stores. Track it under the Actions tab.

Prefer to validate first? Actions → **Publish extension** → *Run workflow* with `dry_run: true` authenticates against both stores and checks the zips **without** uploading. If a release partially fails (one store accepts, the other rejects), retry only the failed store so the successful one isn't re-submitted as a duplicate:

```shell
gh workflow run publish-extension.yml --ref main -f stores=chrome    # or firefox
```

**One-time secrets** (repo → Settings → Secrets and variables → Actions) — obtain them via `pnpm --filter @daily-alt/extension exec wxt submit init`:

- Chrome: `CHROME_EXTENSION_ID`, `CHROME_CLIENT_ID`, `CHROME_CLIENT_SECRET`, `CHROME_REFRESH_TOKEN`
- Firefox: `FIREFOX_EXTENSION_ID`, `FIREFOX_JWT_ISSUER`, `FIREFOX_JWT_SECRET`

> `CHROME_EXTENSION_ID` is the ID from your **Web Store developer dashboard** listing — not an ID copied from an installed extension. A wrong ID still authenticates, then 403s on upload. The Chrome API client should be an OAuth **Desktop app**, and the refresh token must be generated under the Google account that **owns the listing**.

To build a store-ready package locally (e.g. for a manual first submission), bake your API origin in — `host_permissions` auto-tightens to it:

```shell
VITE_API_BASE_URL=https://api.yomi.fyi pnpm --filter @daily-alt/extension zip:prod
```

### 💾 Database

Postgres 16. The schema is managed by **hand-written SQL migrations** in `apps/api/src/db/migrations`, applied in order by `apps/api/src/db/migrate.ts` (`pnpm db:migrate`) and tracked in a `_migrations` table. Queries use [Drizzle](https://orm.drizzle.team). The curated starter sources are seeded from `apps/api/src/ingest/sources.seed.ts` (`pnpm db:seed`).

### 📡 API

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/health` | liveness |
| GET | `/api/feed` | paginated feed (articles + sponsored); supports `cursor`, `limit`, `tag`, `q`, `sources`, `mutedTags`, `mutedSources` |
| GET | `/api/articles/:id` | single article |
| GET | `/api/tags` | top tags by recent article count |
| POST | `/api/events` | anonymous `upvote` / `click` / `impression` |
| GET · POST | `/api/sources` · `/api/sources/:id/vote` | list / submit / vote on community sources |
| POST | `/api/sync/pull` · `/api/sync/push` | encrypted blob sync (optimistic concurrency) |
| * | `/api/admin/*` · `/admin` | sponsored campaigns + source moderation (requires `x-admin-key`) |

## 🔒 Privacy

Personal and behavioral data (bookmarks, upvotes, read-state, streaks, muted lists) lives **on-device**. The server ranks globally and accepts per-request filter params; the only per-device rows it stores are anonymous vote-dedup entries and aggregate ad counters. Yomi shows only titles, short excerpts, attribution, and links — never full article bodies. See [`PRIVACY.md`](PRIVACY.md).

## 🤝 Contributing

Contributions are welcome — see [`CONTRIBUTING.md`](CONTRIBUTING.md). Open an issue to discuss a change, or send a PR; good first issues are labeled `good first issue`. For security issues, follow [`SECURITY.md`](SECURITY.md) instead of opening a public issue.

## 🍕 Community

Got questions or ideas? [Open an issue](https://github.com/ummahrican/yomi/issues) or start a [discussion](https://github.com/ummahrican/yomi/discussions).

## ☕ Support

Yomi is free, open source, and tracker-free — there's no paywall and no ads in the extension. If it earns a spot on your new tab, you can keep it going on [**Ko-fi**](https://ko-fi.com/ummahrican). Entirely optional, always appreciated.

## ⚖️ LICENSE

MIT © [Yomi](LICENSE)
