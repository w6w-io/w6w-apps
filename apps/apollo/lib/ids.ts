/**
 * Path-escape a caller-supplied Apollo record id before interpolating it into a URL.
 *
 * Apollo's own ids are opaque hex strings, but nothing stops a caller pasting a
 * malformed value (a stray `/` or `?`) into an id field — this keeps that from
 * escaping the intended path segment.
 */
export function encodeId(id: string): string {
  return encodeURIComponent(String(id ?? "").trim());
}
