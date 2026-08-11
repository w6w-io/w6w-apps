import type { ActionDefinition } from "@w6w/types";
import { toCsv, VimeoClient, type VimeoCollection } from "../lib/client.ts";
import {
  directionOptions,
  fieldsParam,
  paginationParams,
  showcaseSortOptions,
} from "../lib/params.ts";

/**
 * `GET /me/albums` — the connected account's showcases.
 *
 * ## Showcases are `albums` on the wire, and `/showcases/` in their own URI
 *
 * This one is genuinely confusing and it is worth stating once, here, for all
 * eight showcase actions. Vimeo renamed albums to showcases in the product and
 * the API kept both words in different places:
 *
 *  - the **path** segment is `albums` — `/me/albums/{album_id}`;
 *  - the **response schema** is labelled `Album`;
 *  - but a showcase's own **URI**, as it appears in request parameters like
 *    `album_uris`, is `/showcases/258684873` — Vimeo's own documented example.
 *
 * So a showcase URI is not a valid path and a showcase path is not the URI. All
 * showcase actions here take an id or either URI form and reduce it to the
 * trailing id (`idFromRef`), which makes the distinction stop mattering.
 *
 * `filter_privacy` is a comma-separated list, and Vimeo documents a wider
 * vocabulary for filtering than for setting: `anybody`, `password`,
 * `embed_only`, `team`, `nobody`, `unlisted`.
 */
interface Input {
  query?: string;
  filterPrivacy?: string;
  sort?: string;
  direction?: string;
  page?: number;
  perPage?: number;
  fields?: string;
}

const showcaseList: ActionDefinition<Input, VimeoCollection> = {
  key: "showcase-list",
  type: "search",
  resource: "showcase",
  title: "List Showcases",
  description: "List the showcases belonging to the connected Vimeo account.",
  params: [
    { key: "query", label: "Search query", type: "string" },
    {
      key: "filterPrivacy",
      label: "Privacy",
      type: "string",
      placeholder: "anybody,password",
      hint: "Comma-separated. Vimeo accepts `anybody`, `password`, `embed_only`, `team`, " +
        "`nobody` and `unlisted` here.",
    },
    { key: "sort", label: "Sort by", type: "select", options: showcaseSortOptions },
    { key: "direction", label: "Direction", type: "select", options: directionOptions },
    ...paginationParams,
    fieldsParam,
  ],
  output: [
    { key: "data", type: "array", label: "Showcases" },
    { key: "total", type: "number", label: "Total showcases" },
    { key: "paging", type: "object", label: "First/last/next/previous page URIs" },
  ],

  execute(input, ctx) {
    return new VimeoClient(ctx).collection("/me/albums", {
      query: {
        query: input.query,
        filter_privacy: toCsv(input.filterPrivacy),
        sort: input.sort,
        direction: input.direction,
        page: input.page,
        per_page: input.perPage,
        fields: toCsv(input.fields),
      },
    });
  },
};

export default showcaseList;
