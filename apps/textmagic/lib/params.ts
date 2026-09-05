import type { Param } from "@w6w/types";

/** Shared `page`/`limit` params for every list-style Action. */
export const paginationParams: Param[] = [
  { key: "page", label: "Page", type: "number", hint: "Defaults to 1." },
  {
    key: "limit",
    label: "Results per page",
    type: "number",
    hint: "1–100; out-of-range values are silently replaced with TextMagic's default of 10.",
  },
];

/** Shared `orderBy`/`direction` params, present on several (not all) list endpoints. */
export const orderingParams: Param[] = [
  { key: "orderBy", label: "Order by", type: "string", hint: "Field to sort by. Default is id." },
  {
    key: "direction",
    label: "Direction",
    type: "select",
    options: [{ label: "Ascending", value: "asc" }, { label: "Descending", value: "desc" }],
    hint: "Default is desc.",
  },
];
