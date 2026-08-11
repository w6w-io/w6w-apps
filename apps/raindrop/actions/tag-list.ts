import type { ActionDefinition } from "@w6w/types";
import { collectionId, encodeId, RaindropClient } from "../lib/client.ts";
import { optionalCollectionIdParam } from "../lib/params.ts";

/**
 * `GET /rest/v1/tags` — every tag with its usage count, or
 * `GET /rest/v1/tags/{collectionId}` scoped to one collection.
 *
 * One action for both: the segment is optional and the shape is identical —
 * `items: [{_id: "tag name", count: n}]`, where the tag's **name is its `_id`**.
 * Tags are not entities with numeric ids in this API; the string is the
 * identity, which is why renaming one is a bulk operation over bookmarks rather
 * than an update to a record.
 */
interface Input {
  collectionId?: number;
}

const tagList: ActionDefinition<Input> = {
  key: "tag-list",
  type: "read",
  resource: "tag",
  title: "List Tags",
  description:
    "List tags with the number of bookmarks using each. Optionally scoped to one collection. A " +
    "tag's name is its `_id` — tags have no numeric identity.",
  params: [optionalCollectionIdParam("Leave empty for tags across every collection.")],
  output: [{ key: "items", type: "array", label: "Tags with counts" }],

  async execute(input, ctx) {
    const hasCollection = input.collectionId !== undefined && input.collectionId !== null &&
      String(input.collectionId) !== "";
    const path = hasCollection ? `/tags/${encodeId(collectionId(input.collectionId!))}` : "/tags";

    return { items: await new RaindropClient(ctx).items(path) };
  },
};

export default tagList;
