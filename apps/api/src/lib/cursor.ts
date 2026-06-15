/** Opaque feed cursor: a simple organic-item offset. Doubles as the global
 *  organic index that drives the sponsored-card cadence. */
export interface Cursor {
  n: number;
}

export function encodeCursor(c: Cursor): string {
  return Buffer.from(JSON.stringify(c), "utf8").toString("base64url");
}

export function decodeCursor(raw: string | undefined): Cursor | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (typeof obj.n === "number" && obj.n >= 0) return { n: obj.n };
    return null;
  } catch {
    return null;
  }
}
