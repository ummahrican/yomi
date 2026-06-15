# Privacy Policy — Yomi

_Last updated: 2026-06-14_

Yomi is built to respect your privacy. In plain terms:

- **No accounts.** There is no sign-up and no login.
- **No personal data.** We do not collect your name, email, IP address, or browsing history.
- **On-device storage.** Your bookmarks, upvotes, read history, and preferences are stored
  locally in your browser. They never leave your device except as described below.
- **Anonymous device id.** The extension generates a random identifier (a UUID) stored only
  in your browser. It contains no personal information and is used solely to (a) make sure an
  upvote counts once per device and (b) count ad impressions/clicks without tracking people.
  You can erase it any time with **Settings → Clear local data**.
- **What the server sees.** When the extension loads your feed it requests articles from our
  API. Standard, short-lived web server logs may record the request. We do not build profiles
  and we do not use cookies or third-party trackers.
- **Sponsored posts.** Promoted cards are clearly labeled “Promoted”. We count aggregate
  impressions and clicks (tied only to the anonymous device id) to report performance to
  advertisers. No personal data is shared with advertisers. When you click a promoted card you
  are taken to the advertiser’s own site, which has its own privacy policy.
- **Articles link out.** Yomi shows titles, short excerpts, and links. Clicking an article
  opens the original publisher’s website.
- **Optional sync is end-to-end encrypted.** If you turn on cross-device sync, you get a 12-word
  recovery phrase — there is still no account and no email. Your data is encrypted on your device
  before upload using a key derived from that phrase; the server stores only ciphertext it cannot
  read, addressed by an opaque hash. We cannot see your bookmarks, and we never receive your phrase
  or your encryption key. Lose the phrase and the encrypted copy can’t be recovered (your local
  data and any exported backup remain).

Questions? Open an issue on the project repository.
