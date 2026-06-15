import { useQuery } from "@tanstack/react-query";
import { fetchTags } from "@/src/lib/api";

export function useTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: fetchTags,
    staleTime: 10 * 60 * 1000,
  });
}
