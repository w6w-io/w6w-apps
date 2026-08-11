import type { ActionDefinition } from "@w6w/types";
import { RaindropClient, toIdList } from "../lib/client.ts";

/**
 * `DELETE /rest/v1/collections` — remove several collections at once.
 *
 * **The plural route behaves differently from the singular one, and the
 * difference is the whole reason to know this endpoint exists.** Where
 * `DELETE /collection/{id}` removes a collection *and all its descendants*, this
 * one "Nested collections are ignored (include ID's in `ids` array to remove
 * them)" — a sub-collection whose parent is in the list survives unless it is
 * named too.
 *
 * That is a safety property, not a bug: it lets a workflow delete a flat set
 * without discovering, afterwards, that it also deleted a tree. But a caller
 * expecting the singular endpoint's semantics will be left with orphans.
 *
 * The `ids` go in the request **body**, not the query string.
 *
 * Idempotent: ids that no longer exist are simply not removed again.
 */
interface Input {
  ids: string | Array<number | string>;
}

const collectionDeleteMany: ActionDefinition<Input> = {
  key: "collection-delete-many",
  type: "perform",
  resource: "collection",
  title: "Delete Collections",
  description:
    "Remove several collections at once. Unlike deleting one collection, sub-collections are NOT " +
    "removed unless their IDs are listed too.",
  idempotent: true,
  params: [
    {
      key: "ids",
      label: "Collection IDs",
      type: "string",
      required: true,
      placeholder: "8492393, 8364483",
      hint: "Comma-separated collection IDs. Sub-collections are ignored unless listed here — " +
        "this endpoint does not cascade the way deleting a single collection does.",
    },
  ],
  output: [{ key: "result", type: "boolean", label: "Removed" }],

  async execute(input, ctx) {
    const ids = toIdList(input.ids);
    if (!ids) throw new Error("Collection IDs is required");

    const body = await new RaindropClient(ctx).ok("/collections", {
      method: "DELETE",
      body: { ids },
    });
    return { result: body.result !== false };
  },
};

export default collectionDeleteMany;
