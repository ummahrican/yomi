import { sql } from "drizzle-orm";
import { db, pool } from "../db/client";
import { sources } from "../db/schema";

interface SeedSource {
  slug: string;
  name: string;
  kind: "rss" | "hn" | "devto";
  feedUrl?: string;
  homepageUrl?: string;
  contentType?: "article" | "video";
}

const yt = (id: string) => `https://www.youtube.com/feeds/videos.xml?channel_id=${id}`;

/** ~25 high-quality, broadly-loved tech sources to seed the feed with. */
export const SEED_SOURCES: SeedSource[] = [
  { slug: "hn", name: "Hacker News", kind: "hn", homepageUrl: "https://news.ycombinator.com" },
  { slug: "devto", name: "DEV Community", kind: "devto", homepageUrl: "https://dev.to" },
  { slug: "css-tricks", name: "CSS-Tricks", kind: "rss", feedUrl: "https://css-tricks.com/feed/", homepageUrl: "https://css-tricks.com" },
  { slug: "smashing", name: "Smashing Magazine", kind: "rss", feedUrl: "https://www.smashingmagazine.com/feed/", homepageUrl: "https://www.smashingmagazine.com" },
  { slug: "a-list-apart", name: "A List Apart", kind: "rss", feedUrl: "https://alistapart.com/main/feed/", homepageUrl: "https://alistapart.com" },
  { slug: "google-dev", name: "Google Developers Blog", kind: "rss", feedUrl: "https://developers.googleblog.com/feeds/posts/default", homepageUrl: "https://developers.googleblog.com" },
  { slug: "chrome-dev", name: "Chrome for Developers", kind: "rss", feedUrl: "https://developer.chrome.com/static/blog/feed.xml", homepageUrl: "https://developer.chrome.com" },
  { slug: "web-dev", name: "web.dev", kind: "rss", feedUrl: "https://web.dev/static/blog/feed.xml", homepageUrl: "https://web.dev" },
  { slug: "mdn", name: "MDN Blog", kind: "rss", feedUrl: "https://developer.mozilla.org/en-US/blog/rss.xml", homepageUrl: "https://developer.mozilla.org/en-US/blog/" },
  { slug: "github-blog", name: "GitHub Engineering", kind: "rss", feedUrl: "https://github.blog/engineering.atom", homepageUrl: "https://github.blog" },
  { slug: "netflix-tech", name: "Netflix TechBlog", kind: "rss", feedUrl: "https://netflixtechblog.com/feed", homepageUrl: "https://netflixtechblog.com" },
  { slug: "cloudflare", name: "Cloudflare Blog", kind: "rss", feedUrl: "https://blog.cloudflare.com/rss/", homepageUrl: "https://blog.cloudflare.com" },
  { slug: "stripe-eng", name: "Stripe Engineering", kind: "rss", feedUrl: "https://stripe.com/blog/feed.rss", homepageUrl: "https://stripe.com/blog" },
  { slug: "vercel", name: "Vercel Blog", kind: "rss", feedUrl: "https://vercel.com/atom", homepageUrl: "https://vercel.com/blog" },
  { slug: "react", name: "React Blog", kind: "rss", feedUrl: "https://react.dev/rss.xml", homepageUrl: "https://react.dev/blog" },
  { slug: "node", name: "Node.js Blog", kind: "rss", feedUrl: "https://nodejs.org/en/feed/blog.xml", homepageUrl: "https://nodejs.org/en/blog" },
  { slug: "rust", name: "Rust Blog", kind: "rss", feedUrl: "https://blog.rust-lang.org/feed.xml", homepageUrl: "https://blog.rust-lang.org" },
  { slug: "go", name: "The Go Blog", kind: "rss", feedUrl: "https://go.dev/blog/feed.atom", homepageUrl: "https://go.dev/blog" },
  { slug: "python-insider", name: "Python Insider", kind: "rss", feedUrl: "https://blog.python.org/feeds/posts/default", homepageUrl: "https://blog.python.org" },
  { slug: "martin-fowler", name: "Martin Fowler", kind: "rss", feedUrl: "https://martinfowler.com/feed.atom", homepageUrl: "https://martinfowler.com" },
  { slug: "overreacted", name: "Overreacted", kind: "rss", feedUrl: "https://overreacted.io/rss.xml", homepageUrl: "https://overreacted.io" },
  { slug: "josh-comeau", name: "Josh W. Comeau", kind: "rss", feedUrl: "https://www.joshwcomeau.com/rss.xml", homepageUrl: "https://www.joshwcomeau.com" },
  { slug: "kentcdodds", name: "Kent C. Dodds", kind: "rss", feedUrl: "https://kentcdodds.com/blog/rss.xml", homepageUrl: "https://kentcdodds.com/blog" },
  { slug: "changelog", name: "The Changelog", kind: "rss", feedUrl: "https://changelog.com/feed", homepageUrl: "https://changelog.com" },
  { slug: "infoq", name: "InfoQ", kind: "rss", feedUrl: "https://feed.infoq.com/", homepageUrl: "https://www.infoq.com" },
  { slug: "arstechnica", name: "Ars Technica", kind: "rss", feedUrl: "https://feeds.arstechnica.com/arstechnica/index", homepageUrl: "https://arstechnica.com" },
  { slug: "theverge", name: "The Verge", kind: "rss", feedUrl: "https://www.theverge.com/rss/index.xml", homepageUrl: "https://www.theverge.com" },

  // --- Ethical tech, digital rights & tech-justice spaces ---
  // (Curated for communities that want an alternative to mainstream/Big-Tech framing.)
  { slug: "tech4palestine", name: "Tech for Palestine", kind: "rss", feedUrl: "https://updates.techforpalestine.org/rss/", homepageUrl: "https://techforpalestine.org" },
  { slug: "eff", name: "EFF Deeplinks", kind: "rss", feedUrl: "https://www.eff.org/rss/updates.xml", homepageUrl: "https://www.eff.org" },
  { slug: "404media", name: "404 Media", kind: "rss", feedUrl: "https://www.404media.co/rss/", homepageUrl: "https://www.404media.co" },
  { slug: "pluralistic", name: "Pluralistic (Cory Doctorow)", kind: "rss", feedUrl: "https://pluralistic.net/feed/", homepageUrl: "https://pluralistic.net" },
  { slug: "citation-needed", name: "Citation Needed (Molly White)", kind: "rss", feedUrl: "https://www.citationneeded.news/rss/", homepageUrl: "https://www.citationneeded.news" },
  { slug: "restofworld", name: "Rest of World", kind: "rss", feedUrl: "https://restofworld.org/feed/full/", homepageUrl: "https://restofworld.org" },
  { slug: "tor", name: "The Tor Project", kind: "rss", feedUrl: "https://blog.torproject.org/rss.xml", homepageUrl: "https://blog.torproject.org" },
  { slug: "signal", name: "Signal", kind: "rss", feedUrl: "https://signal.org/blog/rss.xml", homepageUrl: "https://signal.org/blog" },
  { slug: "accessnow", name: "Access Now", kind: "rss", feedUrl: "https://www.accessnow.org/feed/", homepageUrl: "https://www.accessnow.org" },
  { slug: "fsf", name: "Free Software Foundation", kind: "rss", feedUrl: "https://www.fsf.org/static/fsforg/rss/news.xml", homepageUrl: "https://www.fsf.org" },
  { slug: "small-tech", name: "Small Technology Foundation (Aral Balkan)", kind: "rss", feedUrl: "https://ar.al/index.xml", homepageUrl: "https://ar.al" },
  { slug: "themarkup", name: "The Markup", kind: "rss", feedUrl: "https://themarkup.org/feeds/rss.xml", homepageUrl: "https://themarkup.org" },

  // --- Video (curated tech YouTube channels, ingested via per-channel RSS) ---
  { slug: "yt-fireship", name: "Fireship", kind: "rss", contentType: "video", feedUrl: yt("UC2Xd-TjJByJyK2w1zNwY0zQ"), homepageUrl: "https://www.youtube.com/@Fireship" },
  { slug: "yt-theo", name: "Theo – t3․gg", kind: "rss", contentType: "video", feedUrl: yt("UCtuO2h6OwDueF7h3p8DYYjQ"), homepageUrl: "https://www.youtube.com/@t3dotgg" },
  { slug: "yt-primeagen", name: "ThePrimeagen", kind: "rss", contentType: "video", feedUrl: yt("UCUyeluBRhGPCW4rPe_UvBZQ"), homepageUrl: "https://www.youtube.com/@ThePrimeagen" },
  { slug: "yt-computerphile", name: "Computerphile", kind: "rss", contentType: "video", feedUrl: yt("UCoxcjq-8xIDTYp3uz647V5A"), homepageUrl: "https://www.youtube.com/@Computerphile" },
  { slug: "yt-networkchuck", name: "NetworkChuck", kind: "rss", contentType: "video", feedUrl: yt("UCOuGATIAbd2DvzJmUgXn2IQ"), homepageUrl: "https://www.youtube.com/@NetworkChuck" },
  { slug: "yt-codeaesthetic", name: "Code Aesthetic", kind: "rss", contentType: "video", feedUrl: yt("UC0SNGrU20N1Q0SPWimGu7gQ"), homepageUrl: "https://www.youtube.com/@CodeAesthetic" },
];

/** Insert/update the seed sources. Idempotent: re-running keeps names/URLs fresh
 *  without touching health columns or the enabled flag. */
export async function seedSources(): Promise<void> {
  for (const s of SEED_SOURCES) {
    await db
      .insert(sources)
      .values({
        slug: s.slug,
        name: s.name,
        kind: s.kind,
        contentType: s.contentType ?? "article",
        feedUrl: s.feedUrl ?? null,
        homepageUrl: s.homepageUrl ?? null,
        iconUrl: s.homepageUrl ? `https://www.google.com/s2/favicons?domain=${new URL(s.homepageUrl).hostname}&sz=64` : null,
      })
      .onConflictDoUpdate({
        target: sources.slug,
        set: {
          name: sql`EXCLUDED.name`,
          kind: sql`EXCLUDED.kind`,
          contentType: sql`EXCLUDED.content_type`,
          feedUrl: sql`EXCLUDED.feed_url`,
          homepageUrl: sql`EXCLUDED.homepage_url`,
          iconUrl: sql`EXCLUDED.icon_url`,
        },
      });
  }
}

// Allow running directly: `pnpm db:seed`
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  seedSources()
    .then(() => {
      console.log(`Seeded ${SEED_SOURCES.length} sources.`);
      return pool.end();
    })
    .catch((err) => {
      console.error("Seed failed:", err);
      process.exit(1);
    });
}
