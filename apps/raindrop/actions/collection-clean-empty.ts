import type { ActionDefinition } from "@w6w/types";
import { RaindropClient } from "../lib/client.ts";

/**
 * `PUT /rest/v1/collections/clean` — remove every collection with no bookmarks.
 *
 * Takes no parameters and acts on the whole account. The response carries a
 * `count` of what it removed, which is the only way to find out what happened —
 * it does not name them.
 *
 * Idempotent: running it twice removes nothing the second time (`count: 0`).
 *
 * A `PUT` that deletes things is the vendor's choice, not a mistake here.
 */
const collectionCleanEmpty: ActionDefinition<Record<string, never>> = {
  key: "collection-clean-empty",
  type: "perform",
  resource: "collection",
  title: "Remove Empty Collections",
  description:
    "Delete every collection in the account that contains no bookmarks. Returns how many were " +
    "removed, but not which.",
  idempotent: true,
  params: [],
  output: [
    { key: "count", type: "number", label: "Collections removed" },
    { key: "result", type: "boolean", label: "Cleaned" },
  ],

  async execute(_input, ctx) {
    const body = await new RaindropClient(ctx).ok("/collections/clean", { method: "PUT" });
    return {
      count: typeof body.count === "number" ? body.count : 0,
      result: body.result !== false,
    };
  },
};

export default collectionCleanEmpty;
