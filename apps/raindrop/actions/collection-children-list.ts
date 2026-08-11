import type { ActionDefinition } from "@w6w/types";
import { RaindropClient } from "../lib/client.ts";

/**
 * `GET /rest/v1/collections/childrens` — every **nested** collection.
 *
 * The path really is spelled `childrens`. It is the vendor's spelling, it is
 * what the reference documents, and "correcting" it to `children` is a typo the
 * API cannot help you find: authentication runs before routing, so an
 * unauthenticated probe answers the same 72-byte 401 for a real path and a
 * nonsense one (measured 2026-08-11).
 *
 * Returns collections at *any* depth that have a positive `parent.$id`, not just
 * one level down — so pairing it with List Collections gives the whole tree in
 * two calls. Each object's own `sort` field carries its position among its
 * siblings.
 */
const collectionChildrenList: ActionDefinition<Record<string, never>> = {
  key: "collection-children-list",
  type: "read",
  resource: "collection",
  title: "List Sub-Collections",
  description:
    "List every nested collection at any depth (those with a parent). Pair with List Collections " +
    "to reconstruct the full tree.",
  params: [],
  output: [{ key: "items", type: "array", label: "Nested collections" }],

  async execute(_input, ctx) {
    return { items: await new RaindropClient(ctx).items("/collections/childrens") };
  },
};

export default collectionChildrenList;
