# Contributing to Yomi

Thanks for your interest in making Yomi better! This is an open, community-friendly project and contributions of all sizes are welcome — code, docs, bug reports, and source suggestions.

## 🧭 The one non-negotiable: privacy-first

Yomi's whole reason for existing is to be a tech feed that **doesn't track you**. Please keep every contribution consistent with that:

- **Never add analytics, tracking pixels, fingerprinting, or third-party SDKs to the extension.** The new-tab page stays 100% tracker-free.
- Personal/behavioral data (bookmarks, history, streaks, muted lists) stays **on-device**. The server must remain stateless about individual users.
- No surveillance ad networks. Monetization is limited to clearly-labeled sponsored posts and privacy-respecting ad fill.

If a change would require tracking users or weakening the on-device/E2E model, it won't be merged — please open an issue to discuss alternatives first.

## 🙌 Ways to contribute

- **Report a bug** or **request a feature** via the [issue templates](https://github.com/ummahrican/yomi/issues/new/choose).
- **Suggest a source** — the easiest path is the in-app **Settings → suggest a source** flow (community-voted). For curated/default sources, edit `apps/api/src/ingest/sources.seed.ts` and open a PR.
- **Fix a bug or build a feature** — look for issues labeled `good first issue` or `help wanted`.
- **Improve docs** — README, `docs/`, code comments.

## 🛠️ Development setup

See the [README](README.md#%EF%B8%8F-local-development) for full instructions. Quick version:

```shell
pnpm install
cp .env.example .env
pnpm db:up && pnpm db:migrate && pnpm db:seed
pnpm dev        # API on :3000 + extension dev on :3001
```

Project layout (pnpm monorepo): `apps/api` (Fastify + Postgres), `apps/extension` (WXT + React), `packages/shared` (zod contract). See the [Project structure](README.md#-project-structure) table.

## 🔁 Pull request workflow

1. **Fork** the repo and create a branch from `main` (e.g. `fix/feed-cursor`, `feat/source-search`).
2. Make your change. Keep it focused — one logical change per PR.
3. **Before pushing**, make sure the project is green:
   ```shell
   pnpm -r typecheck
   pnpm -r build
   pnpm --filter @daily-alt/extension build:firefox   # both targets must build
   ```
4. Open a PR against `main` and fill in the template. Link any related issue (`Closes #123`).
5. CI runs typecheck + builds on every PR; please get it green.

## 🎨 Code style

- **TypeScript everywhere.** Write code that reads like the surrounding code — match its naming, structure, and comment density.
- Keep the shared contract in `packages/shared` as the single source of truth; don't duplicate zod schemas.
- No formatter config is committed yet, so just keep diffs clean and consistent with nearby code.
- **Migrations are hand-written SQL** in `apps/api/src/db/migrations` (numbered, forward-only) — don't hand-edit applied migrations; add a new one.

### A couple of repo gotchas

- Don't break the `pnpm-workspace.yaml` `overrides` (`@vitejs/plugin-react` is pinned to v4 on purpose) or the `onlyBuiltDependencies` list — see the [pnpm note](README.md#%EF%B8%8F-local-development) in the README.
- Don't edit ingestion code while a hot-reloading `pnpm api` is running *before* applying a matching migration — failed ingests auto-disable sources after repeated errors.

## 📜 Licensing

By contributing, you agree that your contributions are licensed under the project's [MIT License](LICENSE).

## 💬 Questions

Open a [discussion](https://github.com/ummahrican/yomi/discussions) or an issue. For security issues, please follow [SECURITY.md](SECURITY.md) instead of opening a public issue.
