/** Mirrors the shape of a real app's shared client helper — takes the whole
 * input object and does whatever it does with it internally, invisibly to a
 * per-file scan of the CALLING action's own source. */
export function forwardWhole(resource: string, body: unknown): unknown {
  return { resource, body };
}
