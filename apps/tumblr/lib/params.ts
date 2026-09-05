import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the Tumblr actions. Every field, default and
 * ceiling here is copied from Tumblr's own API v2 reference
 * (`https://www.tumblr.com/docs/en/api/v2`, fetched 2026-09-05), not inferred.
 */

/** Every blog-scoped action's first parameter. */
export const blogIdentifierParam: Param = {
  key: "blogIdentifier",
  label: "Blog",
  type: "string",
  required: true,
  placeholder: "staff.tumblr.com",
  hint: "A blog name (staff), a hostname (staff.tumblr.com, or a custom domain), or a t: UUID.",
};

/**
 * The offset/limit pair most list endpoints use.
 *
 * **1–20, inclusive — not a typo.** Tumblr's documented ceiling on `limit` is
 * 20 for essentially every list endpoint this app calls (posts, likes,
 * followers, following, the dashboard, tagged), a page size far smaller than
 * is typical for a REST API (contrast Apify's 1,000). Pulling a large result
 * set means paging with `offset` (capped at 1000) or, for the endpoints that
 * document it, `before`/`after`.
 */
export function limitOffsetParams(limitHint?: string): Param[] {
  return [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 20,
      validation: { integer: true, min: 1, max: 20 },
      hint: limitHint ?? "1–20, inclusive. Tumblr's own ceiling — not paginated further per call.",
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Result number to start at. Capped at 1000 by Tumblr; use before/after beyond that.",
    },
  ];
}

/** `filter` — the non-HTML rendering options every legacy-format post read shares. */
export const filterParam: Param = {
  key: "filter",
  label: "Content filter",
  type: "select",
  options: [
    { value: "text", label: "Plain text (no HTML)" },
    { value: "raw", label: "Raw (as entered — Markdown stays Markdown)" },
  ],
  hint: "Leave empty for the default, HTML-rendered legacy format.",
};

/** `npf=true` — force Neue Post Format content instead of the legacy per-type shape. */
export const npfParam: Param = {
  key: "npf",
  label: "Neue Post Format",
  type: "boolean",
  hint: "Return post content in NPF (content blocks) instead of the legacy, type-specific format.",
};

export const postIdParam: Param = {
  key: "postId",
  label: "Post ID",
  type: "string",
  required: true,
  hint: "The post's numeric id (from a posts-list action's id / id_string field).",
};
