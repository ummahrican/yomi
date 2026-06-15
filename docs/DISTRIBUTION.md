# Yomi — Distribution & Go-To-Market Plan

_A privacy-first, values-aligned dev new-tab extension. Priority channels (your pick): the values-aligned community first, then dev newsletters/creators and the open-source/self-hosting world. Mainstream HN/PH/Reddit are a later, deliberate beat — not the opening move._

The strategy: **start where loyalty is highest and skepticism of surveillance products is a feature, not a bug.** Win a small, vocal, values-aligned base that actually retains and evangelizes, _then_ use that proof (reviews, DAU, testimonials) to earn the bigger, colder mainstream channels. Don't burn a Product Hunt / HN launch before you have retention data and social proof — you only get one good shot at those.

---

## 1. Positioning & messaging

**One-liner:** _"Every new tab, the best of tech — without being tracked for it."_

**Category framing:** daily.dev for people who don't want a feed company building a profile of them. You're not competing on having _more_ content; you're competing on **trust, calm, and openness**.

**Three pillars (use everywhere — store, landing, posts):**
1. **Private by architecture, not by promise.** No account, no tracking pixels, no behavioral profile. Personal data (bookmarks, history, streaks, prefs) stays on-device; the server is stateless about individuals; optional sync is end-to-end encrypted with a recovery phrase the server never sees. _This is verifiable — it's open source._
2. **Open & self-hostable.** MIT-licensed, run it yourself, audit the code, submit and vote on sources. You own your feed.
3. **Values-aligned by default.** The curated seed list intentionally includes digital-rights and Palestine-tech voices alongside dev blogs. This isn't a neutral aggregator pretending to be apolitical — it's a feed built by and for a community that cares where its attention goes.

**Tone:** calm, technical, anti-hype. Avoid growth-hacky language; this audience smells it instantly. Lead with substance and the code.

**What NOT to do (ethos guardrails):** no referral-tracking links, no "invite 3 friends" viral loops that fingerprint, no analytics SDKs in the extension, no dark-pattern retention. Every growth mechanic must survive the question _"would a privacy advocate screenshot this as a bad example?"_

---

## 2. Pre-launch (the week before anything ships)

- **Landing page** (one page, static, free on GitHub Pages/Cloudflare Pages): the one-liner, a 20-sec screen-capture GIF of the new tab, the three pillars, install buttons (greyed "coming to Chrome/Firefox"), a GitHub-star CTA, and an email/RSS list for launch notice. No tracking — use a privacy-respecting form (e.g. self-hosted, or a no-cookie provider).
- **GitHub polish:** the README is strong; add the new `LICENSE`, screenshots/GIF, a crisp "Why Yomi" section mirroring the three pillars, a `CONTRIBUTING.md`, and good first issues. The repo IS your credibility artifact for this audience — it gets read before the extension gets installed.
- **Privacy policy hosted** (see PRODUCTION_READINESS P0.8) — link it from the landing page.
- **Seed the "submit a source" feature** with 5–10 great values-aligned + dev sources already approved, so a new install never sees an empty or generic feed.
- **Founder accounts warmed up:** wherever you'll post (Mastodon/fediverse, relevant Discords/Slacks, dev forums), be a real participant for a week or two first. Cold-dropping a launch link in a community you've never posted in is the fastest way to get ignored or removed.

---

## 3. Launch sequence (staged, ~4–6 weeks)

### Beat 1 — Soft launch to the values-aligned community (Week 1)
The warmest audience; highest retention; most forgiving of v1 rough edges; most likely to value the privacy + values angle over raw feature count.
- **Where:** fediverse/Mastodon (privacy, FOSS, and digital-rights instances), digital-rights and Palestine-tech Discords/Slack/Telegram groups you're _already in_, relevant subreddits with a values lens (r/privacy, r/degoogle) framed honestly.
- **How:** a personal, first-person post — _"I built an open, no-tracking new-tab feed; the seed sources include digital-rights and Palestine-tech voices; here's the code; would love your feedback."_ Lead with the _why_ and the repo, not the install count.
- **Goal:** first 100–300 installs, real feedback, your first store reviews (ask explicitly — reviews are the single biggest ASO lever), 2–3 testimonials, and GitHub stars.

### Beat 2 — Open-source / self-hosting world (Week 2–3)
- **Where:** r/selfhosted, r/opensource, Hacker News _"Show HN"_ (this is the right HN entry point for this audience — frame it as an open, self-hostable tool, not a product launch), `awesome-*` lists (awesome-selfhosted, awesome-privacy, new-tab/productivity lists) via PRs, AlternativeTo (list as a daily.dev alternative), privacy-tool directories (PrivacyTools/PrivacyGuides-adjacent), and Mastodon FOSS circles.
- **How:** the self-hostable angle is the hook here. A short "how it works / how to self-host" writeup. Submit `awesome-list` PRs the day you're live.
- **Goal:** GitHub stars (which compound — they're your trust currency for later mainstream launches), self-hosters, contributors, and steady organic install drip.

### Beat 3 — Dev newsletters & creators (Week 3–5)
- **Where:** newsletters that index on dev tools and/or privacy — TLDR, Console.dev (great fit: it curates dev tools and respects the audience), Cooper Press titles, Changelog (FOSS-friendly), and privacy-leaning creators/bloggers/YouTubers (de-Google, FOSS, productivity-new-tab reviewers).
- **How:** these are mostly **earned, not paid** at your budget. Personal pitch to editors: a tight paragraph + the GIF + the "open, no-tracking, values-aligned" angle + your Beat-1/2 traction as proof. Console.dev and Changelog actively look for exactly this. Offer creators a no-strings "here's the tool, here's why it's different" — no tracking links, no affiliate asks.
- **Budget note:** keep it earned. If you ever spend, a single small TLDR/newsletter classified is the only paid placement worth testing — measure with a dedicated landing path, not a tracking pixel.
- **Goal:** the bigger install steps; this is where you can add 1–3k installs from a good newsletter hit.

### Beat 4 — Mainstream, only once you have proof (Week 5–6+)
- **Product Hunt + a broader HN/Reddit push** — _after_ you have: ≥4-star store ratings with real reviews, a retention number you're proud of, and a few hundred GitHub stars. Use the testimonials and traction from Beats 1–3 as the launch-day social proof. This is the amplifier, not the ignition.

> **Sequencing rule:** never spend a once-only channel (PH, front-page HN) until earlier beats have de-risked the product and given you ammunition. Warm → open → earned → mainstream.

---

## 4. App Store Optimization (ASO)

- **Title:** `Yomi — Tech News on Every New Tab` (keyword "new tab" is the highest-intent search; "tech news" / "developer" capture the rest). Chrome gives ~45 chars before truncation — front-load.
- **Keywords to seed naturally** in summary + description: _new tab, tech news, developer feed, hacker news, dev.to, privacy, open source, RSS, reading, no tracking, daily.dev alternative._ (Don't keyword-stuff — both stores penalize it and the audience hates it.)
- **Screenshots are the conversion lever** (people skim images, not text): captions on each — "Every new tab, a fresh feed", "No account. No tracking.", "Read with live HN comments", "Your data stays on your device", "Optional end-to-end-encrypted sync". (Capture list in PRODUCTION_READINESS.)
- **Reviews drive ranking + install rate** more than anything else. Add a gentle, **non-nagging** in-extension prompt: after ~2 weeks of active use, a single dismissible "enjoying Yomi? a store review helps a lot" — shown once, never again, no tracking. This is the highest-ROI retention-adjacent growth tactic for an extension.
- **"daily.dev alternative"** as a clean-room comparison in the long description + AlternativeTo listing captures high-intent searchers leaving daily.dev for privacy reasons — your sharpest wedge.

---

## 5. Retention loops (ethos-safe)

Retention matters more than installs — a new-tab extension that sticks is opened ~10–30×/day, which is what makes the monetization math work. Loops that don't require tracking:
- **The new-tab habit itself** is the core loop — every tab is a re-engagement with zero notifications needed. Protect it: fast cold-start, never an empty/stale feed, calm default (dark mode).
- **On-device streak** (already built) — gentle, local, non-manipulative; rewards the habit without a server profile.
- **Bookmarks + read-state + "not interested"** (already built) — make the feed feel _yours_ over time, on-device. The longer someone uses it, the better-tuned and harder-to-leave it gets — without any server-side profiling.
- **Optional E2E-encrypted sync** — the retention multiplier: once someone syncs across devices via the recovery phrase, switching cost rises sharply, ethically. Surface it after the user has bookmarks worth syncing, not on day one.
- **Community source submission/voting** — contributors become evangelists; "I added that source" is ownership. Tie into the moderation pipeline so it scales safely.
- **Fresh-content cadence** — the ingestion cron keeps the feed alive; a dead feed is the #1 churn cause for aggregators. Monitor source health (auto-disable already exists).

---

## 6. Metrics to track (privacy-respectingly)

You can measure growth **without tracking individuals** — lean on store-provided + aggregate-only server signals. Never add an analytics SDK to the extension.
- **Installs / uninstalls / active-install count** — from Chrome Web Store + AMO dashboards (no tracking on your side).
- **DAU / tab-opens** — derivable from the **anonymous aggregate** `/api/feed` request volume and the existing anonymous `devices` registry (count of distinct device ids active per day) and aggregate impression events. Keep it count-only; never per-user behavioral logs. This stays inside the ethos because it's aggregate and the server already can't tie it to a person.
- **Retention (D1/D7/D30)** — approximate from store active-install curves + returning-device counts (aggregate). You won't get cohort-perfect numbers without tracking, and that's the correct trade-off.
- **Engagement** — aggregate upvotes/clicks/impressions (already collected anonymously) → feed quality signal.
- **Source health** — # active sources, auto-disabled count, submission/approval volume.
- **Channel attribution** — _without_ tracking pixels: dedicated landing paths/UTM-free distinct URLs per channel + store-referrer data + "where did you hear about us" optional one-tap (local) survey. Coarse but ethos-consistent.
- **Funnel of record:** GitHub stars → landing visits → store-page visits → installs → 2-week-active → reviews. Watch the install→active and active→review conversions hardest.

**North-star:** _engaged DAU_ (devices that open ≥1 tab and interact daily). That's the number monetization depends on.

---

## 7. How distribution ties to the monetization math

Goal: **~$5k/month**, ethically (sponsored posts + EthicalAds; no surveillance ad networks).

**The DAU you need depends on the monetization mix:**
- **EthicalAds in the promoted slot** pays roughly CPM-style on privacy-respecting impressions. Realistic blended RPM is modest, so a **pure-ads path to $5k/mo needs ~2–3k+ engaged DAU** generating enough daily new-tab impressions (each DAU opening ~10–30 tabs/day creates real impression volume, which helps — the new-tab model is impression-rich). This is the floor-fill layer: low effort, scales with DAU, never tracks anyone.
- **Direct sponsors** (clearly-labeled "Promoted" cards, already built, injected at a fixed cadence) pay **far more per impression** than network ads because you're selling a values-aligned, engaged dev audience directly. **A handful of direct sponsors can hit $5k/mo at well under 2–3k DAU** — possibly with a few hundred to low-thousands of _engaged, values-aligned_ DAU, because that audience is exactly what mission-driven dev-tool companies and ethical sponsors pay a premium to reach. **This is where your chosen positioning pays off financially:** the values-aligned community isn't just easier to acquire and retain — it's a more valuable, more defensible ad inventory.
- **Plus / donations** (optional, later) — Open Collective / GitHub Sponsors for the FOSS crowd; a small "Plus" (extra sync, themes) for power users. Won't be the bulk of revenue but compounds goodwill and funds the VPS many times over.

**Sequenced monetization:**
1. **0 → ~500 DAU:** no ads. Focus entirely on retention, reviews, and source quality. Turning on ads too early makes a tiny audience feel mercenary and tanks trust.
2. **~500 → ~1.5k engaged DAU:** turn on **EthicalAds** as floor fill (it's privacy-respecting by design — perfect ethos fit) + open a **donations** page. Start a simple **"Sponsor Yomi"** page pitching direct sponsors with your aggregate DAU + audience description.
3. **~1.5k+ engaged DAU:** sell **direct sponsorships** into the promoted slot — this is the lever that reaches $5k/mo without needing mainstream-scale DAU, _because_ you built a values-aligned, engaged, privacy-conscious audience that ethical sponsors specifically want. EthicalAds fills unsold inventory.

**The throughline:** your distribution choice (values-aligned-first) and your monetization choice (direct-sponsors-first) are the same bet. A smaller, loyal, mission-aligned audience monetizes better per-head and at lower DAU than a large, cold, mainstream one — and it's the only audience whose trust survives _any_ ads at all. Grow the right 2–3k before chasing the easy 50k.

---

## 8. First-30-days checklist
- [ ] Landing page + privacy policy live; GitHub repo polished (LICENSE ✅, screenshots, CONTRIBUTING, good-first-issues).
- [ ] Both extensions submitted & approved (Chrome + Firefox); reviews-prompt wired (ship-once, no tracking).
- [ ] Beat 1 (values-aligned community) posted; collect first reviews + testimonials.
- [ ] Beat 2 (`Show HN`, r/selfhosted, awesome-list PRs, AlternativeTo) live.
- [ ] 3–5 newsletter/creator pitches sent (TLDR, Console.dev, Changelog, privacy creators).
- [ ] Aggregate DAU/installs dashboard stood up (store dashboards + aggregate device count); north-star = engaged DAU.
- [ ] "Sponsor Yomi" one-pager drafted (turn on once ~500 DAU); EthicalAds account applied for.
- [ ] Mainstream PH/HN launch _scheduled for when_ ratings + retention + stars justify it — not before.
