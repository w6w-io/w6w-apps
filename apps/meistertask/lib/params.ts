import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the `items` / `page` / `sort` triad documented
 * at https://developers.meistertask.com/reference/pagination and
 * https://developers.meistertask.com/reference/sorting, plus the numeric-id
 * path params every resource uses.
 */

/**
 * `items` + `page`. Default 50, maximum 500 per the vendor's own docs. No
 * `default` value is set here (leaving it unset sends no `items` param, which
 * is exactly the vendor default) — the hint states the ceiling instead.
 */
export const paginationParams: Param[] = [
  {
    key: "items",
    label: "Items per page",
    type: "number",
    hint: 'Vendor default 50, maximum 500. MeisterTask uses "countless pagination": no response ' +
      "carries a total count, so paging to completion means walking pages until an empty one comes back.",
  },
  {
    key: "page",
    label: "Page",
    type: "number",
    hint: "1-based. A page past the end returns an empty result rather than an error.",
  },
];

export const sortParam: Param = {
  key: "sort",
  label: "Sort by",
  type: "string",
  hint: 'Comma-separated attribute names, each optionally prefixed with "-" for descending ' +
    '(e.g. "-id" or "updated_at,-name"). An unknown attribute is ignored, not rejected. ' +
    "Defaults to ascending by id.",
};

export function idParam(label: string, hint: string): Param {
  return { key: "id", label, type: "number", required: true, hint };
}

/**
 * The label palette, verbatim from the vendor's `PUT /labels/:id` schema
 * description — MeisterTask fixes labels to nine named colors, not a free
 * hex field.
 */
export const labelColorOptions = [
  { value: "d93651", label: "Red" },
  { value: "ff9f1a", label: "Orange" },
  { value: "ffd500", label: "Yellow" },
  { value: "8acc47", label: "Grass green" },
  { value: "47cc8a", label: "Moss green" },
  { value: "30bfbf", label: "Turquoise" },
  { value: "00aaff", label: "Blue" },
  { value: "8f7ee6", label: "Purple" },
  { value: "98aab3", label: "Grey" },
];
