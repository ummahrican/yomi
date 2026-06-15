#!/usr/bin/env node
/**
 * Create a sponsored/promoted post via the admin API.
 *
 * Usage:
 *   ADMIN_API_KEY=your-key API=http://localhost:3000 \
 *     node scripts/create-sponsored.mjs \
 *       --advertiser "Acme" --title "Ship faster" \
 *       --url "https://acme.com/?ref=techtab" \
 *       --image "https://acme.com/banner.png" \
 *       --excerpt "Zero-config CI for modern teams." \
 *       --tags devtools,ci --weight 5
 */
const args = process.argv.slice(2);
const get = (flag) => {
  const i = args.indexOf(`--${flag}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const API = process.env.API ?? "http://localhost:3000";
const KEY = process.env.ADMIN_API_KEY ?? "change-me";

const body = {
  advertiser: get("advertiser"),
  title: get("title"),
  targetUrl: get("url"),
  imageUrl: get("image") ?? null,
  excerpt: get("excerpt") ?? null,
  displaySource: get("source") ?? get("advertiser"),
  tags: (get("tags") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  weight: Number(get("weight") ?? 1),
};

if (!body.advertiser || !body.title || !body.targetUrl) {
  console.error("Required: --advertiser, --title, --url");
  process.exit(1);
}

const res = await fetch(`${API}/api/admin/sponsored`, {
  method: "POST",
  headers: { "content-type": "application/json", "x-admin-key": KEY },
  body: JSON.stringify(body),
});

if (!res.ok) {
  console.error(`Failed: HTTP ${res.status}`, await res.text());
  process.exit(1);
}
console.log("Created sponsored post:", await res.json());
