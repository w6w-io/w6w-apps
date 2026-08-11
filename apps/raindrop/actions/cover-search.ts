import type { ActionDefinition } from "@w6w/types";
import { encodeId, RaindropClient } from "../lib/client.ts";

/**
 * `GET /rest/v1/collections/covers/{text}` — search the collection icon library,
 * or `GET /rest/v1/collections/covers` for the featured set.
 *
 * One action for both, because they are the same endpoint with and without a
 * trailing segment and return the same shape: `items[]`, each
 * `{title, icons: [{png, svg?}]}` grouped by provider (Icons8, Iconfinder, and
 * Raindrop's own templates for the featured set).
 *
 * `svg` is present only for some providers; `png` is always there. A URL from
 * here is what Create/Update Collection's `cover` parameter wants.
 *
 * Despite being an icon *library*, the endpoint still requires a credential — a
 * bare request answers 401 (measured 2026-08-11), like every other path on this
 * API.
 */
interface Input {
  text?: string;
}

const coverSearch: ActionDefinition<Input> = {
  key: "cover-search",
  type: "search",
  resource: "collection",
  title: "Search Covers",
  description:
    "Search Raindrop's collection icon library, or list the featured covers when no term is " +
    "given. Returns provider groups, each with PNG (and sometimes SVG) URLs.",
  params: [
    {
      key: "text",
      label: "Search term",
      type: "string",
      placeholder: "pokemon",
      hint: "Leave empty to get Raindrop's featured cover sets instead of a search.",
    },
  ],
  output: [{ key: "items", type: "array", label: "Cover groups" }],

  async execute(input, ctx) {
    const term = (input.text ?? "").trim();
    const path = term ? `/collections/covers/${encodeId(term)}` : "/collections/covers";
    return { items: await new RaindropClient(ctx).items(path) };
  },
};

export default coverSearch;
