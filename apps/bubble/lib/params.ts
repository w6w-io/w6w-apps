import type { Param } from "@w6w/types";

/** The Data API type name an action targets — see `formatTypeName`. */
export const TYPE_PARAM: Param = {
  key: "type",
  label: "Data Type",
  type: "string",
  required: true,
  placeholder: "rentalunit",
  hint: "The Bubble Data Type's name, as it appears in the Data API — lowercase, no spaces " +
    '(Bubble\'s own example: "Rental Unit" becomes "rentalunit"). It must be checked on in ' +
    "Settings → API → Data API Settings, or Bubble answers 404.",
};

/** The record's Unique ID — Bubble's `_id`. */
export const UNIQUE_ID_PARAM: Param = {
  key: "uniqueId",
  label: "Unique ID",
  type: "string",
  required: true,
  hint: "The record's `_id`, returned by every create/read call.",
};

/** Paging, shared by the list action. */
export const LIST_PARAMS: Param[] = [
  {
    key: "limit",
    label: "Limit",
    type: "number",
    default: 100,
    hint: "Bubble returns at most 100 items per call, and a maximum of 50,000 total via cursor " +
      "paging (10,000,000 on the Enterprise plan).",
  },
  {
    key: "cursor",
    label: "Cursor",
    type: "number",
    default: 0,
    hint: "Rank of the first item to return — pass back the previous response's `cursor + count` " +
      "to fetch the next page.",
  },
  {
    key: "sortField",
    label: "Sort Field",
    type: "string",
    default: "",
    hint: "Field to sort by. Only fields holding a single value can be sorted — not a list field.",
  },
  {
    key: "descending",
    label: "Descending",
    type: "boolean",
    default: false,
    showIf: { "!=": [{ var: "sortField" }, ""] },
  },
  {
    key: "constraints",
    label: "Constraints",
    type: "json",
    default: "",
    hint: 'JSON array of `{"key", "constraint_type", "value"}`. Constraint types: equals, ' +
      "not equal, is_empty, is_not_empty (all field types); text contains, not text contains " +
      "(text fields — matches whole words after stemming, not substrings); greater than, less " +
      "than (text/number/date); in, not in (all field types); contains, not contains, empty, " +
      "not empty (list fields); geographic_search (needs an address and a range).",
  },
  {
    key: "excludeRemaining",
    label: "Exclude Remaining Count",
    type: "boolean",
    default: false,
    advanced: true,
    hint: "Skip counting how many results remain past this page — cheaper on a large table.",
  },
];
