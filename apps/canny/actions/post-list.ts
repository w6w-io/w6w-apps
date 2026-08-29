import type { ActionDefinition } from "@w6w/types";
import { CannyClient, toList } from "../lib/client.ts";
import { boardIdParam, postSortOptions, skipLimitParams } from "../lib/params.ts";

/**
 * `POST /v1/posts/list` — search and filter posts.
 *
 * `sort: "relevance"` is only valid alongside a `search` value (Canny's own
 * constraint); this action does not enforce that client-side and lets Canny's
 * own validation error surface if it's violated, rather than guessing at a
 * fallback Canny never documented.
 */
interface Input {
  boardID?: string;
  authorID?: string;
  companyID?: string;
  tagIDs?: string[] | string;
  limit?: number;
  search?: string;
  skip?: number;
  sort?: string;
  status?: string;
}

const postList: ActionDefinition<Input> = {
  key: "post-list",
  type: "search",
  resource: "post",
  title: "List Posts",
  description: "Search and filter posts across one board or the whole workspace.",
  params: [
    boardIdParam(false),
    { key: "authorID", label: "Author", type: "string", hint: "Only posts by this author." },
    {
      key: "companyID",
      label: "Company",
      type: "string",
      hint: "Only posts created by users linked to this company.",
    },
    {
      key: "tagIDs",
      label: "Tags",
      type: "string",
      repeat: true,
      hint: "Only posts tagged with at least one of these tag ids.",
    },
    { key: "search", label: "Search", type: "string", hint: "Only posts matching this query." },
    {
      key: "status",
      label: "Status",
      type: "string",
      hint: "Comma-separated list of statuses. Only posts with one of these statuses are fetched.",
    },
    {
      key: "sort",
      label: "Sort",
      type: "select",
      options: postSortOptions,
      default: "newest",
    },
    ...skipLimitParams(10, "Defaults to 10 if not specified."),
  ],
  output: [
    { key: "posts", type: "array", label: "Posts" },
    { key: "hasMore", type: "boolean", label: "More posts beyond this page" },
  ],

  execute(input, ctx) {
    return new CannyClient(ctx).post("/posts/list", {
      boardID: input.boardID,
      authorID: input.authorID,
      companyID: input.companyID,
      tagIDs: toList(input.tagIDs),
      limit: input.limit,
      search: input.search,
      skip: input.skip,
      sort: input.sort,
      status: input.status,
    });
  },
};

export default postList;
