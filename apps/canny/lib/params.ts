import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the Canny actions. Every option list here is
 * copied verbatim from the "Arguments" tables in Canny's own API reference
 * (`developers.canny.io/api-reference`, verified 2026-08-29), not inferred.
 */

export const boardIdParam = (required: boolean): Param => ({
  key: "boardID",
  label: "Board",
  type: "string",
  required,
  hint: "The board's unique identifier. Take it from a List Boards result.",
});

export const postIdParam: Param = {
  key: "postID",
  label: "Post",
  type: "string",
  required: true,
  hint: "The post's unique identifier.",
};

export const tagIdParam: Param = {
  key: "tagID",
  label: "Tag",
  type: "string",
  required: true,
  hint: "The tag's unique identifier.",
};

/**
 * `skip`/`limit` — the pagination style Canny's v1 list endpoints use
 * (`posts/list`, `tags/list`, `categories/list`, `entries/list`).
 */
export function skipLimitParams(defaultLimit: number, limitHint: string): Param[] {
  return [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: defaultLimit,
      validation: { integer: true, min: 1 },
      hint: limitHint,
    },
    {
      key: "skip",
      label: "Skip",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Number of records to skip before starting to fetch. Defaults to 0.",
    },
  ];
}

/**
 * `cursor`/`limit` — the pagination style Canny's v2 list endpoints use
 * (`comments/list`, `companies/list`, `status_changes/list`, `users/list`,
 * `votes/list`). A cursor from a previous page's response continues it;
 * omit it to start from the first page.
 */
export function cursorLimitParams(defaultLimit: number, maxLimit: number): Param[] {
  return [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: defaultLimit,
      validation: { integer: true, min: 1, max: maxLimit },
      hint: `Must be between 1 and ${maxLimit}. Defaults to ${defaultLimit}.`,
    },
    {
      key: "cursor",
      label: "Cursor",
      type: "string",
      advanced: true,
      hint: "A pagination cursor returned from a previous call to this action. Leave empty to " +
        "fetch the first page.",
    },
  ];
}

/**
 * `posts/list`'s `sort` — the one enum where Canny documents a hard
 * constraint on a *combination* of arguments: "relevance" is only valid when
 * `search` is also set.
 */
export const postSortOptions = [
  { value: "newest", label: "Newest (default)" },
  { value: "oldest", label: "Oldest" },
  { value: "relevance", label: "Relevance (requires a search query)" },
  { value: "score", label: "Score (vote count)" },
  { value: "statusChanged", label: "Recently status-changed" },
  { value: "trending", label: "Trending" },
];

/**
 * `posts/change_status`'s `status`. Canny's own text: "Options include:
 * 'open', 'under review', 'planned', 'in progress', 'complete', 'closed', or
 * any other status your team has set" — so this is a hint-carrying free-text
 * field, not a closed `select`, since a workspace can define custom statuses
 * this app has no way to enumerate.
 */
export const postStatusParam: Param = {
  key: "status",
  label: "Status",
  type: "string",
  required: true,
  hint: 'One of "open", "under review", "planned", "in progress", "complete", "closed", or a ' +
    "custom status your team has configured on the board's settings page.",
};

/** `entries/create` and `entries/list`'s `type`. */
export const entryTypeOptions = [
  { value: "new", label: "New" },
  { value: "improved", label: "Improved" },
  { value: "fixed", label: "Fixed" },
];

export const entrySortOptions = [
  { value: "nonPublishedFirst", label: "Drafts first (default)" },
  { value: "created", label: "Created" },
  { value: "lastSaved", label: "Last saved" },
  { value: "publishedAt", label: "Published at" },
];
