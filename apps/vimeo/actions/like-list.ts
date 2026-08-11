import type { ActionDefinition } from "@w6w/types";
import { toCsv, VimeoClient, type VimeoCollection } from "../lib/client.ts";
import { fieldsParam, paginationParams } from "../lib/params.ts";

/**
 * `GET /me/likes` — the videos the connected account has liked.
 *
 * The likes group has its own `sort` vocabulary — `alphabetical`, `comments`,
 * `date`, `duration`, `likes`, `plays` — and, notably, **no `direction`
 * parameter**, so the sort order is Vimeo's. The list here is the endpoint's
 * own, not the one from `/me/videos`.
 *
 * The `filter`/`filter_embeddable` pair behaves as everywhere else: `filter`
 * names the attribute (`embeddable` is the only value this endpoint accepts)
 * and the boolean picks the side.
 */
interface Input {
  query?: string;
  filterEmbeddable?: boolean;
  sort?: string;
  page?: number;
  perPage?: number;
  fields?: string;
}

const likeSortOptions = [
  { value: "alphabetical", label: "Alphabetical" },
  { value: "comments", label: "Comments" },
  { value: "date", label: "Date created" },
  { value: "duration", label: "Duration" },
  { value: "likes", label: "Likes" },
  { value: "plays", label: "Plays" },
];

const likeList: ActionDefinition<Input, VimeoCollection> = {
  key: "like-list",
  type: "search",
  resource: "like",
  title: "List Liked Videos",
  description: "List the videos the connected Vimeo account has liked.",
  params: [
    { key: "query", label: "Search query", type: "string" },
    {
      key: "filterEmbeddable",
      label: "Embeddable only",
      type: "boolean",
      hint: "True for embeddable, false for non-embeddable. Unset returns both.",
    },
    {
      key: "sort",
      label: "Sort by",
      type: "select",
      options: likeSortOptions,
      hint: "This endpoint documents no sort direction, so the order is Vimeo's.",
    },
    ...paginationParams,
    fieldsParam,
  ],
  output: [
    { key: "data", type: "array", label: "Liked videos" },
    { key: "total", type: "number", label: "Total liked videos" },
    { key: "paging", type: "object", label: "First/last/next/previous page URIs" },
  ],

  execute(input, ctx) {
    return new VimeoClient(ctx).collection("/me/likes", {
      query: {
        query: input.query,
        filter: input.filterEmbeddable === undefined ? undefined : "embeddable",
        filter_embeddable: input.filterEmbeddable,
        sort: input.sort,
        page: input.page,
        per_page: input.perPage,
        fields: toCsv(input.fields),
      },
    });
  },
};

export default likeList;
