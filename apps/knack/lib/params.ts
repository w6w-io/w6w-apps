import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the Knack actions.
 *
 * Every field key/hint here is copied from Knack's own reference docs
 * (`docs.knack.com/reference`, fetched 2026-09-05), not inferred.
 */

/** The Object every record action operates on. Required on every single one — see `lib/client.ts`. */
export const objectKeyParam: Param = {
  key: "objectKey",
  label: "Object",
  type: "string",
  required: true,
  placeholder: "object_1",
  hint: "The Knack Object (table) key, e.g. `object_1`. Find it in the Builder: open the table, " +
    'or enable "Show System Fields" on it to see keys directly in the grid. One Connection can ' +
    "reach every Object in the app, so this is chosen per Action, not per Connection.",
};

export const recordIdParam: Param = {
  key: "recordId",
  label: "Record ID",
  type: "string",
  required: true,
  placeholder: "58643557d1ea9432222f3cbb",
  hint: "A record's `id`, as returned by List Records, Get Record, or Create Record.",
};

/** `rows_per_page` — Knack's own default and ceiling. */
export const rowsPerPageParam: Param = {
  key: "rowsPerPage",
  label: "Rows per page",
  type: "number",
  default: 25,
  validation: { integer: true, min: 1, max: 1000 },
  hint: "Knack's default is 25; the maximum is 1,000.",
};

export const pageParam: Param = {
  key: "page",
  label: "Page",
  type: "number",
  default: 1,
  validation: { integer: true, min: 1 },
  hint: "Used together with Rows per page once Total records exceeds it.",
};

export const sortFieldParam: Param = {
  key: "sortField",
  label: "Sort field",
  type: "string",
  placeholder: "field_25",
  hint: "The field key to sort by, e.g. `field_25`. Leave empty for Knack's default order.",
};

export const sortOrderParam: Param = {
  key: "sortOrder",
  label: "Sort order",
  type: "select",
  options: [
    { value: "asc", label: "Ascending" },
    { value: "desc", label: "Descending" },
  ],
  hint: "Only used when Sort field is set.",
};

/**
 * Knack's filter tree: `{"match": "and"|"or", "rules": [{field, operator, value?}, ...]}`.
 *
 * Taken as free-form JSON rather than a generated form because the set of
 * valid `operator` values is per field TYPE (`constructing-filters`,
 * `filters-field-types`) and is not enumerable without knowing the target
 * Object's schema, which this app never has in advance.
 */
export const filtersParam: Param = {
  key: "filters",
  label: "Filters",
  type: "json",
  hint: 'A Knack filter object, e.g. `{"match":"and","rules":[{"field":"field_1",' +
    '"operator":"is","value":"Acme"}]}`. Build one visually by filtering a table in the ' +
    "Builder or a Live App and copying the resulting URL's `filters` value. Available " +
    "operators depend on the field's type.",
};

/**
 * The record body for create/update: an object of `field_N` -> value pairs
 * this Object's own schema defines. Free-form because that schema is
 * per-Knack-app and this client never sees it.
 */
export const fieldsParam: Param = {
  key: "fields",
  label: "Field values",
  type: "json",
  required: true,
  hint:
    'An object of field keys to values, e.g. `{"field_1": "Acme Inc.", "field_18": "Other"}`. ' +
    "Keys are this Object's own field keys, from the Builder.",
};
