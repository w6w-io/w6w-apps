import type { ActionDefinition } from "@w6w/types";
import { toCsv, VimeoClient, type VimeoCollection } from "../lib/client.ts";
import {
  directionOptions,
  fieldsParam,
  paginationParams,
  videoSearchSortOptions,
} from "../lib/params.ts";

/**
 * `GET /videos` — search public videos across Vimeo.
 *
 * A different endpoint from `GET /me/videos` with a different parameter set,
 * despite the similar name. This one searches everything public; that one lists
 * the connected account's uploads.
 *
 * Two documented constraints shape the params below, and both are enforced by
 * the API with a `400` (error code 2101) rather than ignored:
 *
 *  - `uris` and `links` are lookup-by-identity parameters. Vimeo states for
 *    both: "Querying, filtering, and sorting aren't supported when using this
 *    field." So when either is set, `query`, `filter`, `sort` and `direction`
 *    are dropped here rather than sent and rejected.
 *  - `filter` on this endpoint is a *Creative Commons licence* vocabulary
 *    (`CC`, `CC-BY`, `CC0`, …) plus `categories`, `duration`, `in-progress`,
 *    `minimum_likes`, `trending` and `upload_date`. It has nothing to do with
 *    the `embeddable`/`playable` filter on `/me/videos`. Only the CC arm is
 *    offered, because the others each need a companion parameter this action
 *    does not model.
 *
 * `sort: "relevant"` exists only here.
 */
interface Input {
  query?: string;
  uris?: string;
  links?: string;
  license?: string;
  sort?: string;
  direction?: string;
  page?: number;
  perPage?: number;
  fields?: string;
}

const licenseFilterOptions = [
  { value: "CC", label: "Any Creative Commons licence" },
  { value: "CC-BY", label: "CC BY — attribution" },
  { value: "CC-BY-NC", label: "CC BY-NC — attribution, non-commercial" },
  { value: "CC-BY-NC-ND", label: "CC BY-NC-ND" },
  { value: "CC-BY-NC-SA", label: "CC BY-NC-SA" },
  { value: "CC-BY-ND", label: "CC BY-ND" },
  { value: "CC-BY-SA", label: "CC BY-SA" },
  { value: "CC0", label: "CC0 — public domain" },
];

const videoSearch: ActionDefinition<Input, VimeoCollection> = {
  key: "video-search",
  type: "search",
  resource: "video",
  title: "Search Videos",
  description: "Search public videos across Vimeo, or look several up by URI or URL.",
  params: [
    { key: "query", label: "Search query", type: "string", placeholder: "staff picks" },
    {
      key: "uris",
      label: "Video URIs",
      type: "string",
      placeholder: "/videos/122375452,/videos/273576296",
      hint: "Comma-separated. Look videos up by URI. Vimeo disables querying, filtering and " +
        "sorting when this is set, so those are dropped.",
    },
    {
      key: "links",
      label: "Video URLs",
      type: "string",
      placeholder: "https://vimeo.com/122375452",
      hint: "Comma-separated. Same trade-off as Video URIs.",
    },
    {
      key: "license",
      label: "Creative Commons licence",
      type: "select",
      options: licenseFilterOptions,
    },
    { key: "sort", label: "Sort by", type: "select", options: videoSearchSortOptions },
    { key: "direction", label: "Direction", type: "select", options: directionOptions },
    ...paginationParams,
    fieldsParam,
  ],
  output: [
    { key: "data", type: "array", label: "Videos" },
    { key: "total", type: "number", label: "Total matching videos" },
    { key: "paging", type: "object", label: "First/last/next/previous page URIs" },
  ],

  execute(input, ctx) {
    const uris = toCsv(input.uris);
    const links = toCsv(input.links);
    // Vimeo rejects the combination outright (400, error code 2101), so the
    // incompatible half is dropped rather than sent.
    const byIdentity = uris !== undefined || links !== undefined;

    return new VimeoClient(ctx).collection("/videos", {
      query: {
        uris,
        links,
        query: byIdentity ? undefined : input.query,
        filter: byIdentity ? undefined : input.license,
        sort: byIdentity ? undefined : input.sort,
        direction: byIdentity ? undefined : input.direction,
        page: input.page,
        per_page: input.perPage,
        fields: toCsv(input.fields),
      },
    });
  },
};

export default videoSearch;
