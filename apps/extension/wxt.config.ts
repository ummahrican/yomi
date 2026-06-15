import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";

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
    // Only the API origin needs a host permission (images/favicons load as plain
    // resources and don't). For production, replace localhost with your deployed
    // API, e.g. "https://api.yourdomain.com/*", to keep the permission prompt tight.
    host_permissions: ["http://localhost:3000/*", "http://127.0.0.1:3000/*"],
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
