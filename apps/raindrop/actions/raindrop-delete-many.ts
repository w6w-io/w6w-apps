import type { ActionDefinition } from "@w6w/types";
import { collectionId, encodeId, RaindropClient, toIdList } from "../lib/client.ts";
import { collectionIdParam, nestedParam, searchParam } from "../lib/params.ts";

/**
 * `DELETE /rest/v1/raindrops/{collectionId}` — remove many bookmarks at once.
 *
 * Three sharp edges, all documented and all easy to hit:
 *
 *  1. **Empty selection means everything.** With no `ids` and no `search`, the
 *     whole collection goes. That is the documented behaviour of the endpoint,
 *     which makes an empty `ids` field an account-scale operation.
 *  2. **Collection `-99` deletes permanently.** "When `:collectionId` is -99,
 *     raindrops will be permanently removed!" Everywhere else the bookmarks land
 *     in Trash and are recoverable.
 *  3. **Collection `0` is not supported.** Same vendor warning as the batch
 *     update: "update or remove methods not support `0` yet." Refused up front
 *     here rather than sent and misinterpreted.
 *
 * `ids` goes in the body; `search` goes in the query string. That asymmetry is
 * the vendor's, and it is why they are not merged into one place here.
 *
 * Idempotent: the ids that remain after a first attempt are the ones the retry
 * removes, converging on the same state.
 */
interface Input {
  collectionId: number;
  ids?: string | Array<number | string>;
  search?: string;
  nested?: boolean;
}

const raindropDeleteMany: ActionDefinition<Input> = {
  key: "raindrop-delete-many",
  type: "perform",
  resource: "raindrop",
  title: "Delete Raindrops",
  description:
    "Move many bookmarks to Trash. With no IDs and no search this empties the WHOLE collection; " +
    "with collection -99 it destroys them permanently.",
  idempotent: true,
  params: [
    collectionIdParam({
      default: undefined,
      hint: 'The collection to remove from. Collection 0 ("all") is NOT supported by the ' +
        "remove endpoint. -99 is Trash, and removing from Trash is permanent.",
    }),
    {
      key: "ids",
      label: "Raindrop IDs",
      type: "string",
      placeholder: "373777232, 373777233",
      hint: "Comma-separated. LEAVE EMPTY AND THE WHOLE COLLECTION IS REMOVED — combine with a " +
        "search term to narrow it.",
    },
    searchParam,
    nestedParam,
  ],
  output: [
    { key: "modified", type: "number", label: "Bookmarks removed" },
    { key: "result", type: "boolean", label: "Removed" },
  ],

  async execute(input, ctx) {
    const id = collectionId(input.collectionId);
    if (id === 0) {
      throw new Error(
        'Raindrop\'s remove endpoint does not support collection 0 ("all collections") — ' +
          "name a real collection, or -1 for Unsorted / -99 for Trash",
      );
    }

    const ids = toIdList(input.ids);
    const res = await new RaindropClient(ctx).ok(`/raindrops/${encodeId(id)}`, {
      method: "DELETE",
      query: {
        search: input.search,
        nested: input.nested === true ? "true" : undefined,
      },
      ...(ids ? { body: { ids } } : {}),
    });
    return {
      modified: typeof res.modified === "number" ? res.modified : 0,
      result: res.result !== false,
    };
  },
};

export default raindropDeleteMany;
