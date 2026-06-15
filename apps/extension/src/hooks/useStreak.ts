import { useEffect, useState } from "react";
import { recordVisit, type Streak } from "@/src/lib/streak";

/** Records today's visit on mount and returns the current streak. */
export function useStreak(): Streak | null {
  const [streak, setStreak] = useState<Streak | null>(null);
  useEffect(() => {
    void recordVisit().then(setStreak);
  }, []);
  return streak;
}
