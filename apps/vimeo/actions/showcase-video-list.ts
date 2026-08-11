import type { ActionDefinition } from "@w6w/types";
import { idFromRef, toCsv, VimeoClient, type VimeoCollection } from "../lib/client.ts";
import {
  directionOptions,
  fieldsParam,
  paginationParams,
  showcaseIdParam,
  showcaseVideoSortOptions,
} from "../lib/params.ts";

/**
 * `GET /me/albums/{album_id}/videos` — the videos in a showcase.
 *
 * Two parameters here exist nowhere else in this app:
 *
 *  - `sort: "manual"` — the showcase's arranged order. A showcase is a curated
 *    ordering, so this is often the only sort that means anything.
 *  - `weak_search` — "Whether to include private videos in the search. Please
 *    note that a separate search service provides this functionality. The
 *    service performs a partial text search on the video's name." It changes
 *    which service answers, so it is exposed rather than hidden.
 *
 * `password` is a **query** parameter here: it is the password of a
 * password-protected showcase, supplied to read it. It is a `type: "secret"`
 * param for the obvious reason.
 *
 * The `filter`/`filter_embeddable` pair works exactly as on `video-list` —
 * `filter` names the attribute and the boolean picks the side, and neither is
 * valid alone.
 */
interface Input {
  showcaseId: string;
  query?: string;
  password?: string;
  filterEmbeddable?: boolean;
  weakSearch?: boolean;
  containingUri?: string;
  sort?: string;
  direction?: string;
  page?: number;
  perPage?: number;
  fields?: string;
}

const showcaseVideoList: ActionDefinition<Input, VimeoCollection> = {
  key: "showcase-video-list",
  type: "search",
  resource: "showcase",
  title: "List Videos in Showcase",
  description: "List the videos in a showcase, in the showcase's own order if you ask for it.",
  params: [
    showcaseIdParam,
    { key: "query", label: "Search query", type: "string" },
    {
      key: "password",
      label: "Showcase password",
      type: "secret",
      hint: "Only needed for a password-protected showcase.",
    },
    {
      key: "filterEmbeddable",
      label: "Embeddable only",
      type: "boolean",
      hint: "True for embeddable, false for non-embeddable. Unset returns both.",
    },
    {
      key: "weakSearch",
      label: "Include private videos in the search",
      type: "boolean",
      hint: "Hands the query to Vimeo's search service, which does a partial match on the " +
        "video's name.",
    },
    {
      key: "containingUri",
      label: "Page containing video URI",
      type: "string",
      placeholder: "/videos/258684937",
    },
    { key: "sort", label: "Sort by", type: "select", options: showcaseVideoSortOptions },
    { key: "direction", label: "Direction", type: "select", options: directionOptions },
    ...paginationParams,
    fieldsParam,
  ],
  output: [
    { key: "data", type: "array", label: "Videos" },
    { key: "total", type: "number", label: "Total videos in the showcase" },
    { key: "paging", type: "object", label: "First/last/next/previous page URIs" },
  ],

  execute(input, ctx) {
    return new VimeoClient(ctx).collection(
      `/me/albums/${idFromRef(input.showcaseId, "Showcase ID")}/videos`,
      {
        query: {
          query: input.query,
          password: input.password,
          filter: input.filterEmbeddable === undefined ? undefined : "embeddable",
          filter_embeddable: input.filterEmbeddable,
          weak_search: input.weakSearch,
          containing_uri: input.containingUri,
          sort: input.sort,
          direction: input.direction,
          page: input.page,
          per_page: input.perPage,
          fields: toCsv(input.fields),
        },
      },
    );
  },
};

export default showcaseVideoList;
