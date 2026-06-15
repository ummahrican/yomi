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
        className={`flex flex-col items-center justify-center gap-2 ${className ?? ""}`}
        style={{
          background: `radial-gradient(circle at 30% 25%, hsl(${hue} 55% 42%), hsl(${(hue + 45) % 360} 60% 22%))`,
        }}
        aria-hidden
      >
        {/* Default cover for posts without an image: the Yomi logo (logov1.webp),
            zoomed to crop the asset's padding, on a source-tinted gradient. */}
        <span className="grid h-12 w-12 place-items-center overflow-hidden rounded-2xl bg-white shadow-sm">
          <img src="/logov1.webp" alt="" className="h-full w-full scale-[1.6] object-cover" />
        </span>
        <span className="line-clamp-1 px-3 text-center text-xs font-medium text-white/85">
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
