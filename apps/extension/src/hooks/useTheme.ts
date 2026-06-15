import { useEffect, useState } from "react";
import type { Prefs } from "@daily-alt/shared";

/** Resolve the theme pref into an actual light/dark value and apply the
 *  `dark` class to <html> so Tailwind's dark variant takes effect. */
export function useResolvedTheme(theme: Prefs["theme"]): "light" | "dark" {
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const compute = (): "light" | "dark" => {
      if (theme === "system") return mq.matches ? "dark" : "light";
      return theme;
    };
    const apply = () => {
      const r = compute();
      setResolved(r);
      document.documentElement.classList.toggle("dark", r === "dark");
      document.documentElement.style.backgroundColor = r === "dark" ? "#09090b" : "#fafafa";
    };
    apply();
    if (theme === "system") {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [theme]);

  return resolved;
}
