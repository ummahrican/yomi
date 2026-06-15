import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 1000 * 60 * 60 * 24, // keep 24h so a cold new tab renders instantly
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Persist the query cache to localStorage so the last feed renders offline /
// before the network resolves on a fresh tab.
export const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: "yomi-query-cache",
  throttleTime: 1000,
});
