import type { Param } from "@w6w/types";

/** Every endpoint under a social set takes it as the first path segment. */
export const socialSetIdParam: Param = {
  key: "socialSetId",
  label: "Social Set ID",
  type: "number",
  required: true,
  hint: "The numeric id of the social set (account) — list them with Get Current User's " +
    "social sets or List Social Sets.",
};

export const draftIdParam: Param = {
  key: "draftId",
  label: "Draft ID",
  type: "number",
  required: true,
};

export const commentThreadIdParam: Param = {
  key: "commentThreadId",
  label: "Comment Thread ID",
  type: "string",
  required: true,
  hint: "UUID of the comment thread, from List Comment Threads or Create Comment Thread.",
};

export const commentIdParam: Param = {
  key: "commentId",
  label: "Comment ID",
  type: "string",
  required: true,
  hint: "UUID of the comment, from the thread's `comments` list.",
};

/** `limit`/`offset` pagination pair. Default/max vary by endpoint — pass them explicitly. */
export function paginationParams(defaultLimit: number, maxLimit: number): Param[] {
  return [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: defaultLimit,
      hint: `Maximum items per page (max ${maxLimit}).`,
      validation: { min: 1, max: maxLimit, integer: true },
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      default: 0,
      hint: "Number of items to skip from the beginning.",
      validation: { min: 0, integer: true },
    },
  ];
}

export const excludeCommentMarkersParam: Param = {
  key: "excludeCommentMarkers",
  label: "Exclude Comment Markers",
  type: "boolean",
  default: false,
  hint: "Render text without <typ:comment-thread> markers, for read-only display/export " +
    "(LLM context, CSV, dashboards). Do not feed a response taken with this on back into " +
    "Update Draft unless you intend to resolve or remove the comment anchors it carries.",
};
