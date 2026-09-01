import type { Param } from "@w6w/types";

/** Paging, shared by every list action. Tableau's own maximum page size is 1000. */
export const LIST_PARAMS: Param[] = [
  {
    key: "returnAll",
    label: "Return All",
    type: "boolean",
    default: false,
    hint: "Page through every result.",
  },
  {
    key: "limit",
    label: "Limit",
    type: "number",
    default: 100,
    hint: "Maximum results when Return All is off.",
    showIf: { "==": [{ var: "returnAll" }, false] },
  },
];

/** Tableau's `filter` query parameter — shared shape, resource-specific fields. */
export const FILTER_PARAM: Param = {
  key: "filter",
  label: "Filter",
  type: "string",
  default: "",
  advanced: true,
  hint: 'Tableau filter expression, e.g. `name:eq:Sales`. See "Filtering and Sorting" in the ' +
    "Tableau REST API reference.",
};

/** Tableau's `sort` query parameter. */
export const SORT_PARAM: Param = {
  key: "sort",
  label: "Sort",
  type: "string",
  default: "",
  advanced: true,
  hint: "Tableau sort expression, e.g. `name:asc`. Undefined order when omitted.",
};
