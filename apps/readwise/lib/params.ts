import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the Readwise actions.
 *
 * Every enum here is transcribed verbatim from the prose tables at
 * `readwise.io/api_deets` (read 2026-08-29), not inferred from a sibling
 * integration.
 */

/**
 * Highlight CREATE's `category` values. Narrower than {@link bookCategoryOptions}
 * — Books LIST additionally reports `supplementals`, which is not a value the
 * create endpoint accepts.
 */
export const highlightCategoryOptions = [
  { value: "books", label: "Books" },
  { value: "articles", label: "Articles" },
  { value: "tweets", label: "Tweets" },
  { value: "podcasts", label: "Podcasts" },
];

/** Books LIST's `category` filter — the superset that also includes `supplementals`. */
export const bookCategoryOptions = [
  { value: "books", label: "Books" },
  { value: "articles", label: "Articles" },
  { value: "tweets", label: "Tweets" },
  { value: "supplementals", label: "Supplementals" },
  { value: "podcasts", label: "Podcasts" },
];

/**
 * `location_type` on Highlight CREATE. `time_offset` changes how `location` is
 * interpreted — see {@link locationHint}.
 */
export const locationTypeOptions = [
  { value: "page", label: "Page" },
  { value: "location", label: "Location" },
  { value: "none", label: "None" },
  { value: "order", label: "Order (default)" },
  { value: "offset", label: "Offset" },
  { value: "time_offset", label: "Time offset" },
];

export const locationHint =
  "Used to order highlights. If omitted, Readwise fills it from the order of highlights in the " +
  'request. When location_type is "time_offset", this is interpreted as seconds elapsed from the ' +
  "start of the recording.";

/** Highlight UPDATE's `color` — one of six fixed tags. */
export const highlightColorOptions = [
  { value: "yellow", label: "Yellow" },
  { value: "blue", label: "Blue" },
  { value: "pink", label: "Pink" },
  { value: "orange", label: "Orange" },
  { value: "green", label: "Green" },
  { value: "purple", label: "Purple" },
];

/**
 * `page_size` / `page`, shared by every DRF-paginated LIST endpoint
 * (highlights, books, and both tag lists). Default is the vendor's own
 * (100, max 1000) — unlike Apify's 1,000-row default, Readwise's own default
 * is reasonable enough to keep rather than override.
 */
export function pageParams(): Param[] {
  return [
    {
      key: "page_size",
      label: "Page size",
      type: "number",
      default: 100,
      validation: { integer: true, min: 1, max: 1000 },
      hint: "Results per page. Vendor default is 100, maximum 1000.",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Page number to fetch. Defaults to 1.",
    },
  ];
}

export const highlightIdParam: Param = {
  key: "highlightId",
  label: "Highlight ID",
  type: "string",
  required: true,
  placeholder: "13",
  hint: "The highlight's numeric id, from its `id` field.",
};

export const bookIdParam: Param = {
  key: "bookId",
  label: "Book ID",
  type: "string",
  required: true,
  placeholder: "1776",
  hint: "The book/article/podcast's numeric id (`user_book_id` in the Export response, `id` " +
    "elsewhere).",
};

export const tagIdParam: Param = {
  key: "tagId",
  label: "Tag ID",
  type: "string",
  required: true,
  placeholder: "11311390",
  hint: "The tag's numeric id, from its `id` field.",
};

export const tagNameParam: Param = {
  key: "name",
  label: "Tag name",
  type: "string",
  required: true,
  hint: "Maximum length 512 characters on a book tag, 127 on a highlight tag.",
};

/** Shared `updated__lt` / `updated__gt` datetime filters (highlights and books). */
export function updatedFilterParams(): Param[] {
  return [
    {
      key: "updated__gt",
      label: "Updated after",
      type: "datetime",
      hint: "ISO 8601. Only return records updated after this time.",
    },
    {
      key: "updated__lt",
      label: "Updated before",
      type: "datetime",
      hint: "ISO 8601. Only return records updated before this time.",
    },
  ];
}
