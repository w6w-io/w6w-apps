import type { ActionDefinition } from "@w6w/types";
import { collectionId, encodeId, RaindropClient } from "../lib/client.ts";
import {
  collectionIdParam,
  nestedParam,
  paginationParams,
  raindropSortOptions,
  searchParam,
} from "../lib/params.ts";

/**
 * `GET /rest/v1/raindrops/{collectionId}` — list or search bookmarks.
 *
 * **Plural.** The collection id is a *path* segment, not a query parameter, and
 * it is required even when you want everything: `0` is the id that means "all
 * collections except Trash". `-1` is Unsorted and `-99` is Trash. None of the
 * three is ever returned by a collection list, so a caller who has only seen
 * List Collections has no way to learn they exist — which is why the parameter
 * defaults to `0` and spells them out.
 *
 * ## Paging is page/perpage, and 50 is a hard ceiling
 *
 * `perpage` maxes out at 50 ("How many raindrops per page. 50 max") and `page`
 * is zero-based. There is no cursor and no `total` documented on this endpoint,
 * so walking a collection means incrementing `page` until a short page comes
 * back.
 *
 * ## `sort: score` only means something with a search term
 *
 * The vendor documents it as "only applicable when search is specified".
 * Selecting it without a query is not rejected, it just does not sort by
 * anything useful — so the option label says so rather than leaving the user to
 * find out.
 */
interface Input {
  collectionId: number;
  search?: string;
  sort?: string;
  perpage?: number;
  page?: number;
  nested?: boolean;
}

const raindropSearch: ActionDefinition<Input> = {
  key: "raindrop-search",
  type: "search",
  resource: "raindrop",
  title: "Search Raindrops",
  description:
    "List or search the bookmarks in a collection. Use collection 0 for everything except Trash, " +
    "-1 for Unsorted, -99 for Trash.",
  params: [
    collectionIdParam(),
    searchParam,
    {
      key: "sort",
      label: "Sort",
      type: "select",
      options: raindropSortOptions,
      hint: "Newest first when left empty. Relevance only does something alongside a search term.",
    },
    ...paginationParams("Zero-based. There is no cursor: page until a short page comes back."),
    nestedParam,
  ],
  output: [{ key: "items", type: "array", label: "Raindrops" }],

  async execute(input, ctx) {
    const id = collectionId(input.collectionId ?? 0);
    const items = await new RaindropClient(ctx).items(`/raindrops/${encodeId(id)}`, {
      query: {
        search: input.search,
        sort: input.sort,
        perpage: input.perpage,
        page: input.page,
        // Only sent when true: the vendor documents the parameter as opt-in and
        // says nothing about how a literal `false` is parsed.
        nested: input.nested === true ? "true" : undefined,
      },
    });
    return { items };
  },
};

export default raindropSearch;
