import type { ActionDefinition } from "@w6w/types";
import { encodeId, RaindropClient } from "../lib/client.ts";

/**
 * `DELETE /rest/v1/collection/{id}` — remove a collection.
 *
 * Two behaviours worth knowing before running this from a schedule:
 *
 *  1. **It removes descendants too.** "Remove an existing collection and all its
 *     descendants." Deleting a parent takes every sub-collection with it.
 *  2. **Bookmarks survive, in Trash.** "Raindrops will be moved to 'Trash'
 *     collection" — they are recoverable until Trash is emptied.
 *
 * And one that is genuinely dangerous: **`id: -99` is Trash, and deleting Trash
 * empties it permanently.** The vendor documents `DELETE /collection/-99` as its
 * own "Empty Trash" method; it is the same route, so this action can do it. It
 * is not a separate action here precisely because that would make a destructive,
 * unrecoverable operation look like an ordinary one. The parameter validation
 * still allows the value — refusing it would mean this app cannot do something
 * the API can — but the hint says exactly what it does.
 *
 * Idempotent: deleting an already-deleted collection converges on the same state.
 */
interface Input {
  id: number;
}

const collectionDelete: ActionDefinition<Input> = {
  key: "collection-delete",
  type: "perform",
  resource: "collection",
  title: "Delete Collection",
  description:
    "Remove a collection and all its sub-collections. Bookmarks inside move to Trash rather than " +
    "being destroyed.",
  idempotent: true,
  params: [
    {
      key: "id",
      label: "Collection ID",
      type: "number",
      required: true,
      validation: { integer: true },
      hint: "Deletes the collection AND every sub-collection under it; the bookmarks move to " +
        "Trash. Passing -99 here is Raindrop's Empty Trash operation and destroys those " +
        "bookmarks permanently.",
    },
  ],
  output: [{ key: "result", type: "boolean", label: "Removed" }],

  async execute(input, ctx) {
    const body = await new RaindropClient(ctx).ok(`/collection/${encodeId(input.id)}`, {
      method: "DELETE",
    });
    return { result: body.result !== false };
  },
};

export default collectionDelete;
