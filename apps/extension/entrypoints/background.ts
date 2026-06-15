/**
 * Minimal background service worker. Kept tiny on purpose — the new-tab page
 * does its own fetching/caching. This exists mainly so WXT emits a valid MV3
 * background entry and gives us a hook for future cache-warming if needed.
 */
export default defineBackground(() => {
  // No-op for now.
});
