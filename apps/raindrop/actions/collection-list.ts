import type { ActionDefinition } from "@w6w/types";
import { RaindropClient } from "../lib/client.ts";

/**
 * `GET /rest/v1/collections` — the **root** collections only.
 *
 * This is half of a tree, not a flat list, and the split is the vendor's:
 * `/collections` returns collections with no parent, `/collections/childrens`
 * (the vendor's spelling) returns every collection that has one. Reading only
 * this endpoint and calling it "my collections" silently omits every
 * sub-collection.
 *
 * Neither endpoint returns the three system collections — Unsorted (`-1`),
 * Trash (`-99`) and the `0` pseudo-collection meaning "everything". The
 * reference is explicit: "They are not contained in any API responses." So an
 * empty result here does not mean the account has no bookmarks.
 *
 * The sort order of root collections is *not* in these objects either: it lives
 * in the authenticated user's `groups[].collections` array, which Get Account
 * returns. That is the third call the vendor's own "Nested structure" page
 * apologises for.
 */
const collectionList: ActionDefinition<Record<string, never>> = {
  key: "collection-list",
  type: "read",
  resource: "collection",
  title: "List Collections",
  description:
    "List the account's root collections (those with no parent). Sub-collections come from List " +
    "Sub-Collections; system collections are never listed.",
  params: [],
  output: [{ key: "items", type: "array", label: "Root collections" }],

  async execute(_input, ctx) {
    return { items: await new RaindropClient(ctx).items("/collections") };
  },
};

export default collectionList;
