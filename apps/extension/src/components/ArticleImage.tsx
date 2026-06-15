import { useState } from "react";

/** Image with a branded fallback (Yomi mark on a source-tinted gradient). */
export function ArticleImage({
  src,
  alt,
  sourceName,
  className,
}: {
  src: string | null;
  alt: string;
  sourceName: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    const hue = [...sourceName].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
    return (
      <div
        className={`flex flex-col items-center justify-center gap-1.5 ${className ?? ""}`}
        style={{
          background: `radial-gradient(circle at 30% 25%, hsl(${hue} 55% 42%), hsl(${(hue + 45) % 360} 60% 22%))`,
        }}
        aria-hidden
      >
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 text-lg font-extrabold text-white shadow-sm backdrop-blur-sm">
          Y
        </span>
        <span className="line-clamp-1 px-3 text-center text-xs font-medium text-white/80">
          {sourceName}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
