import type { ActionDefinition } from "@w6w/types";
import { collectionId, encodeId, RaindropClient } from "../lib/client.ts";
import { optionalCollectionIdParam, paginationParams } from "../lib/params.ts";

/**
 * `GET /rest/v1/highlights` — every highlight in the account, or
 * `GET /rest/v1/highlights/{collectionId}` for one collection's.
 *
 * One action for both: the collection segment is the only difference and the
 * response shape is identical.
 *
 * Each item carries `raindropRef` — the `_id` of the bookmark it belongs to —
 * which is how you get from a highlight back to its source. The reference's
 * field table for a "single highlight object" omits `raindropRef` entirely; it
 * appears only in the sample response, and it is the field that makes the
 * endpoint useful.
 *
 * Default page size is 25, maximum 50 — this is one of the two places the vendor
 * documents a default at all.
 *
 * A bookmark's highlights are also reachable the other way round, as the
 * `highlights[]` field of Get Raindrop.
 */
interface Input {
  collectionId?: number;
  perpage?: number;
  page?: number;
}

const highlightList: ActionDefinition<Input> = {
  key: "highlight-list",
  type: "read",
  resource: "highlight",
  title: "List Highlights",
  description: "List highlights across the whole account or within one collection. Each carries " +
    "`raindropRef`, the ID of the bookmark it came from.",
  params: [
    optionalCollectionIdParam("Leave empty for every highlight in the account."),
    ...paginationParams("Zero-based page number."),
  ],
  output: [{ key: "items", type: "array", label: "Highlights" }],

  async execute(input, ctx) {
    const hasCollection = input.collectionId !== undefined && input.collectionId !== null &&
      String(input.collectionId) !== "";
    const path = hasCollection
      ? `/highlights/${encodeId(collectionId(input.collectionId!))}`
      : "/highlights";

    return {
      items: await new RaindropClient(ctx).items(path, {
        query: { perpage: input.perpage, page: input.page },
      }),
    };
  },
};

export default highlightList;
