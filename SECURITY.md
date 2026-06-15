# Security Policy

We take security seriously — Yomi runs a public API with an admin surface, fetches user-submitted URLs, and offers end-to-end-encrypted sync, so responsible disclosure genuinely helps protect users.

## 📦 Supported versions

Yomi is pre-1.0 and ships from `main`. Security fixes land on `main` and in the latest published extension build. Please report issues against the current `main`.

## 🔐 Reporting a vulnerability

**Please do not open a public issue for security vulnerabilities.**

Use **GitHub's private vulnerability reporting**:

> Repo → **Security** tab → **Report a vulnerability**

(Maintainers: enable this under Settings → Code security → Private vulnerability reporting.)

If you can't use that, open a minimal public issue asking a maintainer to reach out — without any exploit details — and we'll set up a private channel.

### Please include

- A clear description and the impact.
- Steps to reproduce or a proof of concept.
- Affected component (API, extension, sync, admin) and version/commit.
- Any suggested remediation.

### What to expect

- Acknowledgement within a few days.
- An assessment and, for valid reports, a fix plan with timeline.
- Credit in the release notes if you'd like it (let us know).

We ask that you give us reasonable time to ship a fix before any public disclosure, and that you avoid privacy violations, data destruction, or service disruption while testing.

## 🎯 Scope

**In scope**

- The API (`apps/api`) — auth/`ADMIN_API_KEY` handling, the `/admin` dashboard, rate limiting, input validation.
- **SSRF** via community feed submission (`/api/sources`) and ingestion fetches.
- The sync endpoints and the E2E-encryption / CRDT model (`/api/sync/*`).
- The extension (`apps/extension`) — including anything that could leak on-device data or weaken the no-tracking guarantees.

**Out of scope**

- Vulnerabilities in third-party publisher sites that articles link out to.
- Issues that require a compromised host, a self-modified build, or an already-stolen 12-word recovery phrase.
- Best-practice/hardening suggestions with no concrete exploit — those are welcome as normal issues or PRs.

## 🔎 Notes on the privacy model

By design the server stores no personal/behavioral data, and sync blobs are ciphertext the server cannot read (keyed by an opaque hash). Reports demonstrating that any of these guarantees can be broken are especially valuable.
