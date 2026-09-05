import type { ActionDefinition } from "@w6w/types";
import { OntraportClient } from "../lib/client.ts";
import { bulkActionParams, type CollectionInput, collectionQuery } from "../lib/params.ts";

/** `GET /1/Tags` — a collection of tags. */
type Input = CollectionInput;

const tagList: ActionDefinition<Input> = {
  key: "tag-list",
  type: "search",
  resource: "tag",
  title: "List Tags",
  description: "Retrieve a collection of tags, filtered, sorted and paginated.",
  params: [
    { key: "ids", label: "IDs", type: "string" },
    ...bulkActionParams,
  ],
  output: [{ key: "items", type: "array", label: "Tags" }],

  async execute(input, ctx) {
    const { items, count } = await new OntraportClient(ctx).list("/Tags", {
      query: collectionQuery(input),
    });
    return { items, count };
  },
};

export default tagList;
