import type { ActionDefinition } from "@w6w/types";
import { toCsv, VimeoClient, type VimeoCollection } from "../lib/client.ts";
import {
  directionOptions,
  fieldsParam,
  paginationParams,
  queryFieldsOptions,
  videoSortOptions,
} from "../lib/params.ts";

/**
 * `GET /me/videos` — the videos the authenticated user has uploaded.
 *
 * `/me/videos` is the documented alias of `GET /users/{user_id}/videos`
 * (`x-mill-path-aliases: ["/me/videos"]`), and using it means no action ever
 * has to know the connection's numeric user id.
 *
 * Two parameter pairs on this endpoint are joined, and Vimeo says so in the
 * parameter descriptions rather than in a rule you can guess:
 *
 *  - `filter=embeddable` requires `filter_embeddable=true|false`. The filter
 *    names the attribute; the boolean says which side of it you want. Sending
 *    the filter alone is a 400.
 *  - `containing_uri` ("the page that contains the video URI") is documented as
 *    "available only when not paired with **query**", so the two are mutually
 *    exclusive.
 *
 * Requires a token with the `private` scope: these are the user's own uploads,
 * public or not.
 */
interface Input {
  query?: string;
  queryFields?: string[] | string;
  filterTag?: string;
  filterTagAllOf?: string;
  filterTagExclude?: string;
  filterEmbeddable?: boolean;
  containingUri?: string;
  sort?: string;
  direction?: string;
  page?: number;
  perPage?: number;
  fields?: string;
}

const videoList: ActionDefinition<Input, VimeoCollection> = {
  key: "video-list",
  type: "search",
  resource: "video",
  title: "List My Videos",
  description: "List the videos the connected Vimeo account has uploaded.",
  params: [
    { key: "query", label: "Search query", type: "string", placeholder: "Stop motion" },
    {
      key: "queryFields",
      label: "Search in",
      type: "multiselect",
      options: queryFieldsOptions,
      hint: "Defaults to title, description, chapters and tags.",
    },
    {
      key: "filterTag",
      label: "Has any of these tags",
      type: "string",
      placeholder: "abc,xyz",
      hint: "Comma-separated. Results must carry at least one.",
    },
    {
      key: "filterTagAllOf",
      label: "Has all of these tags",
      type: "string",
      placeholder: "abc,xyz",
      hint: "Comma-separated. Results must carry every one.",
    },
    {
      key: "filterTagExclude",
      label: "Excludes these tags",
      type: "string",
      placeholder: "abc,xyz",
      hint: "Comma-separated. Results must carry none of them.",
    },
    {
      key: "filterEmbeddable",
      label: "Embeddable only",
      type: "boolean",
      hint: "Set true for embeddable videos, false for non-embeddable. Leaving it unset returns " +
        "both — Vimeo needs the `embeddable` filter and this boolean together.",
    },
    {
      key: "containingUri",
      label: "Page containing video URI",
      type: "string",
      placeholder: "/videos/258684937",
      hint: "Jump to the page holding this video. Vimeo ignores it when a search query is also " +
        "set, so use one or the other.",
    },
    { key: "sort", label: "Sort by", type: "select", options: videoSortOptions },
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
    return new VimeoClient(ctx).collection("/me/videos", {
      query: {
        query: input.query,
        query_fields: toCsv(input.queryFields),
        filter_tag: toCsv(input.filterTag),
        filter_tag_all_of: toCsv(input.filterTagAllOf),
        filter_tag_exclude: toCsv(input.filterTagExclude),
        // The pair is all-or-nothing: `filter` names the attribute and
        // `filter_embeddable` chooses the side. Sending either alone is a 400.
        filter: input.filterEmbeddable === undefined ? undefined : "embeddable",
        filter_embeddable: input.filterEmbeddable,
        containing_uri: input.query ? undefined : input.containingUri,
        sort: input.sort,
        direction: input.direction,
        page: input.page,
        per_page: input.perPage,
        fields: toCsv(input.fields),
      },
    });
  },
};

export default videoList;
