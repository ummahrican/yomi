# Yomi — Launch TODO & Go-To-Market

Working checklist to take Yomi live. Detail lives in `docs/PRODUCTION_READINESS.md`
(engineering/deploy) and `docs/DISTRIBUTION.md` (full GTM rationale). This file is
the actionable punch-list, including the **graphics/recordings only you can make**.

Legend: ☐ todo · 🔥 blocks launch · 👤 needs you (account/secret/asset) · 💻 I can do

---

## A. Assets & graphics you need to create 👤

The code is done; these visuals are the main thing gating the store + landing page.

### A1. 🔥 Hero product demo (highest impact)
- ☐ Record a **~10–15s muted screen capture** of the new-tab feed: open a new tab → feed loads → scroll → hover a card → open the reader with HN comments → bookmark. Calm, smooth, dark mode.
- ☐ Export **two** formats for the landing hero: `webm`/`mp4` (autoplay, muted, loop) and a fallback poster image.
- **Tooling (macOS):** QuickTime or [Kap](https://getkap.co) to record → trim → export. Convert/compress with `ffmpeg` (e.g. `ffmpeg -i in.mov -vf scale=1280:-2 -an -movflags +faststart out.mp4`) or make a GIF with `gifski` if you prefer.
- ☐ Drop it into `site/index.html` (replace the `.shot .ph` placeholder).

### A2. 🔥 Feature screenshots (for landing + stores)
Capture these 5 in dark mode, populated feed, clean window (hide bookmarks bar):
- ☐ The new-tab feed (the money shot)
- ☐ Card hover with upvote + bookmark affordances
- ☐ Reader modal with live HN comment thread
- ☐ Settings → privacy / "Clear local data" (sells the ethos)
- ☐ The 12-word recovery-phrase sync screen (sells the differentiator)
- ☐ Wire them into the `.feature .fph` placeholders in `site/index.html`.

### A3. 🔥 Store screenshots (exact sizes)
- ☐ **Chrome Web Store:** 1–5 images at **1280×800** (or 640×400). Add a 1–2 word caption baked onto each ("No tracking", "Read with HN comments", etc.).
- ☐ **Firefox AMO:** same screenshots work (no fixed size, 1280×800 is fine).
- ☐ **Chrome promo tile (optional, boosts placement):** 440×280.
- Tip: frame the 1280×800 shots on a subtle brand-indigo background with the caption — don't just paste a raw screenshot.

### A4. Social / OG share image
- ☐ **1200×630** OG image (logo + tagline "Tech news on every new tab, without the tracking") for link previews. Add `<meta property="og:image">` to `site/index.html` (placeholder TODO already in the file).

### A5. Icon polish (optional)
- ☐ Current icon is a clean generated placeholder (`pnpm icons`, the indigo feed-glyph). Good enough to ship; commission a designer later if you want a distinctive mark. Store icon = the 128px (already produced).

---

## B. Landing page & site 💻/👤

The enhanced page is built (`site/index.html` + `site/privacy.html`): hero, feature
sections, **vs-daily.dev table**, FAQ, social-proof strip — zero third-party scripts.

- ☐ 👤 Embed the hero demo (A1) and feature screenshots (A2).
- ☐ 👤 Replace store-link `#` placeholders with real Chrome/AMO URLs once published.
- ☐ 👤 Fill the stats strip with real numbers (GitHub stars, install count) once you have them.
- ☐ 👤 **GitHub Pages:** repo Settings → Pages → Source = **GitHub Actions** (the `pages.yml` workflow publishes only `site/`).
- ☐ 👤 **Custom domain (optional):** point `yomi.<tld>` (or `www`) at Pages, add a `site/CNAME` file. Keep `api.<tld>` for the API (Dokploy).
- ☐ 👤 **Self-hosted Umami (optional, marketing site only):** deploy Umami on `analytics.<yourdomain>` (Dokploy has a one-click template), create a website, then uncomment the snippet at the bottom of `site/index.html` and fill in the website-id. **Never add analytics to the extension.**

---

## C. Deploy the backend (Dokploy) 🔥 👤

Full steps in `deploy/DOKPLOY.md`. Condensed:
- ☐ Register a domain (~$10/yr). Point `api.<domain>` A record at the Dokploy host.
- ☐ Dokploy → create managed **Postgres 16**; enable scheduled backups to S3/R2.
- ☐ Dokploy → **Application** from `ummahrican/yomi`, Dockerfile `apps/api/Dockerfile`, context = repo root.
- ☐ Set env: `NODE_ENV=production`, `DATABASE_URL`, `ADMIN_API_KEY` (`openssl rand -hex 32`), `INGEST_CONTACT_URL`, etc.
- ☐ Add domain `api.<domain>` → port 3000, HTTPS on. Deploy. Verify `curl https://api.<domain>/health`.
- ☐ Enable Dokploy GitHub webhook so `main` pushes auto-deploy.
- ☐ (Recommended) Add **Sentry/GlitchTip** error monitoring (P1.1 in the audit).

---

## D. Ship the extension 🔥 👤

- ☐ Build store packages with the prod API baked in — `host_permissions` auto-tightens to that origin (P0.5):
  ```shell
  VITE_API_BASE_URL=https://api.<domain> pnpm --filter @daily-alt/extension zip:prod
  ```
  Produces both `chrome-mv3` and `firefox-mv2` zips in `apps/extension/.output/`. (CI also uploads dev-build zips as artifacts.)
- ☐ Register **Chrome Web Store** dev account ($5 one-time) + **Mozilla AMO** (free).
- ☐ Host the privacy policy (GitHub Pages `privacy.html` is ready) — both stores require the URL.
- ☐ Fill listing copy (drafts in `docs/PRODUCTION_READINESS.md` → Store-submission) + screenshots (A3).
- ☐ Submit Chrome + Firefox. Be ready to justify the new-tab override + the single host permission.

---

## E. Go-to-market (sequenced) 🚀

Rationale in `docs/DISTRIBUTION.md`. **Warm → open → earned → mainstream.** Don't burn
Product Hunt / front-page HN until you have ratings + retention + stars to show.

### E0. Pre-launch (week before)
- ☐ Landing page + privacy policy live; demo GIF embedded.
- ☐ GitHub repo polished: README "Why Yomi", screenshots, `CONTRIBUTING.md`, good-first-issues. (LICENSE ✅)
- ☐ Seed feed has great content so first-open is never empty.
- ☐ Warm up your accounts in the communities you'll post to (be a real participant first).
- ☐ Collect a small launch-notify list (privacy-respecting form, no cookies).

### E1. Beat 1 — Values-aligned community (week 1) ⭐ start here
- ☐ Personal, first-person post (lead with the *why* + the repo, not install counts) to: fediverse/Mastodon privacy & FOSS & digital-rights instances, the Palestine-tech / digital-rights Discords/Telegram/Slack you're already in, r/privacy, r/degoogle.
- ☐ **Explicitly ask early users for store reviews** (single biggest ASO lever) + collect 2–3 testimonials.
- 🎯 Goal: first 100–300 installs, real feedback, first reviews + stars.

### E2. Beat 2 — Open source / self-hosting (week 2–3)
- ☐ `Show HN` framed as an open, self-hostable tool.
- ☐ r/selfhosted, r/opensource; submit PRs to `awesome-selfhosted`, `awesome-privacy`, new-tab/productivity lists.
- ☐ List on AlternativeTo as a **daily.dev alternative**; privacy-tool directories.
- 🎯 Goal: GitHub stars (your trust currency for later), self-hosters, contributors.

### E3. Beat 3 — Dev newsletters & creators (week 3–5)
- ☐ Earned-first pitches (tight paragraph + GIF + your Beat 1–2 traction) to: **Console.dev**, **TLDR**, **Changelog**, Cooper Press titles, privacy/de-Google YouTubers & bloggers.
- ☐ No tracking links, no affiliate asks — give creators the tool + the "why it's different" angle.
- 🎯 Goal: the bigger install steps (a good newsletter hit = 1–3k installs).

### E4. Beat 4 — Mainstream amplifier (week 5–6+, only when ready)
- ☐ **Product Hunt** + broader HN/Reddit — *after* ≥4★ store ratings, a retention number you're proud of, and a few hundred stars. Use Beat 1–3 testimonials as launch-day social proof.

---

## F. Metrics & monetization gates 📊

Track **privacy-respectingly** (store dashboards + aggregate server counts + Umami on the
site). North-star = **engaged DAU** (devices opening ≥1 tab & interacting daily).

- ☐ Stand up the dashboard: installs/uninstalls (store), aggregate daily active devices, tab-opens, retention curve, reviews, GitHub stars.
- ☐ **0 → ~500 DAU:** no ads. Pure focus on retention, reviews, source quality.
- ☐ **~500 → ~1.5k DAU:** turn on **EthicalAds** floor-fill + a donations page; draft a "Sponsor Yomi" one-pager.
- ☐ **~1.5k+ engaged DAU:** sell **direct sponsorships** into the promoted slot (the lever that hits ~$5k/mo at low DAU because your audience is premium inventory). EthicalAds fills unsold slots.

---

### Quick wins I can do next (just ask) 💻
- `build:prod` script (bakes in prod `VITE_API_BASE_URL` + tightened host_permissions)
- "Sponsor Yomi" one-pager + a `/sponsors` section
- README "Why Yomi" rewrite + `CONTRIBUTING.md` + good-first-issues
- OG share image as an SVG→PNG (same dependency-free pipeline as the icons)
- Redirect store-link placeholders to a "coming soon" state until published
