import type { ActionDefinition } from "@w6w/types";
import { encodeId, RaindropClient } from "../lib/client.ts";
import { collectionPathIdParam } from "../lib/params.ts";

/**
 * `GET /rest/v1/collection/{id}` — one collection.
 *
 * **Singular.** `/collections/{id}` is not this endpoint; the plural path is the
 * root list and ignores a trailing segment differently. The singular/plural
 * split runs through the whole API and is the single most common way to write a
 * request that fails for a reason the error message will not explain.
 *
 * The single-item response carries two fields the list form omits — `access.for`
 * and `access.root`, plus `author` — because they describe *your* relationship
 * to a possibly-shared collection rather than the collection itself.
 */
interface Input {
  id: number;
}

const collectionGet: ActionDefinition<Input> = {
  key: "collection-get",
  type: "read",
  resource: "collection",
  title: "Get Collection",
  description: "Fetch one collection by ID, including your access level for it.",
  params: [collectionPathIdParam],
  output: [{ key: "item", type: "object", label: "Collection" }],

  async execute(input, ctx) {
    return { item: await new RaindropClient(ctx).item(`/collection/${encodeId(input.id)}`) };
  },
};

export default collectionGet;
