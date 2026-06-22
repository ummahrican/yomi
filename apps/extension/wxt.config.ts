import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";

// The extension calls the API at VITE_API_BASE_URL (baked in at build time) and
// needs a matching host permission. Derive the host permission from the same
// value so they can never drift. For a production store build, run e.g.
//   VITE_API_BASE_URL=https://api.yomi.fyi pnpm zip:prod
// which bakes in the URL AND tightens host_permissions to that single origin.
const API_BASE = process.env.VITE_API_BASE_URL || "http://localhost:3000";

function hostPermissions(base: string): string[] {
  try {
    const u = new URL(base);
    if (u.hostname === "localhost" || u.hostname === "127.0.0.1") {
      // Local dev: allow both spellings of loopback.
      return ["http://localhost:3000/*", "http://127.0.0.1:3000/*"];
    }
    return [`${u.origin}/*`];
  } catch {
    return ["http://localhost:3000/*", "http://127.0.0.1:3000/*"];
  }
}

// Surface what gets baked in so a store build is never silently pointed at localhost.
console.log(`[wxt] API base: ${API_BASE}  host_permissions: ${hostPermissions(API_BASE).join(", ")}`);

// https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  // WXT's dev server defaults to port 3000 — the same port the API uses. Pin it
  // to 3001 so `pnpm ext` and `pnpm api` don't clash. (This is just the dev/HMR
  // server; the extension still calls the API at VITE_API_BASE_URL = :3000.)
  dev: {
    server: {
      port: 3001,
    },
  },
  manifest: {
    name: "Yomi — Latest in Tech on Every New Tab",
    description:
      "An open, community-friendly feed of the latest tech articles on every new tab. Aggregated from hundreds of developer blogs.",
    permissions: ["storage"],
    // Logo-derived icons (webp) in public/icon, served from the extension root.
    icons: {
      16: "/icon/icon16.webp",
      32: "/icon/icon32.webp",
      48: "/icon/icon48.webp",
      128: "/icon/icon128.webp",
    },
    // Only the API origin needs a host permission (images/favicons load as plain
    // resources and don't). Derived from VITE_API_BASE_URL so prod builds tighten
    // this to the single deployed origin automatically.
    host_permissions: hostPermissions(API_BASE),
    browser_specific_settings: {
      gecko: {
        id: "yomi@yomi.dev",
        strict_min_version: "115.0",
      },
    },
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
