import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the Baserow actions.
 *
 * Every option and default here comes from Baserow's own OpenAPI document
 * (v2.3.3, fetched 2026-08-10), not from inference.
 */

/** The table every row action operates on. */
export const tableIdParam: Param = {
  key: "tableId",
  label: "Table ID",
  type: "number",
  required: true,
  validation: { integer: true, min: 1 },
  hint:
    "The numeric id in the Baserow URL when the table is open. List Tables returns every table " +
    "this connection's token can reach.",
};

/**
 * `user_field_names`, defaulted ON.
 *
 * Off, Baserow keys row data by internal field id (`field_4321`); on, by the
 * field's actual name. The default is on because a workflow that maps fields by
 * number breaks silently the first time a field is deleted and recreated.
 */
export const userFieldNamesParam: Param = {
  key: "userFieldNames",
  label: "Use field names",
  type: "boolean",
  default: true,
  hint: 'On (the default), rows are keyed by field name — `{"Name": "Ada"}`. Off, they are keyed ' +
    'by internal field id — `{"field_4321": "Ada"}`. Field ids survive a rename; names ' +
    "survive a re-creation.",
};

/**
 * `send_webhook_events`, left unset by default.
 *
 * Baserow fires the table's webhooks after a write unless this is off. Left
 * unset the vendor default (on) applies; it is exposed because a bulk import
 * that fans out to every webhook is a real way to melt a downstream system.
 */
export const sendWebhookEventsParam: Param = {
  key: "sendWebhookEvents",
  label: "Send webhook events",
  type: "boolean",
  hint:
    "Baserow triggers the table's webhooks after this write unless you turn it off. Worth turning " +
    "off for a bulk load.",
};

/** The `view` scoping parameter, present on every row write. */
export const viewParam: Param = {
  key: "view",
  label: "View ID",
  type: "number",
  validation: { integer: true, min: 1 },
  hint: "Perform the operation as if in this view, which can change permission checks and the " +
    "default values applied.",
};

/**
 * Baserow's row filters are dynamically-named query parameters, which no form
 * can enumerate — so they are taken as a JSON object and validated in
 * `mergeFilters`.
 */
export const fieldFiltersParam: Param = {
  key: "fieldFilters",
  label: "Field filters",
  type: "json",
  hint: 'An object of Baserow filter parameters, e.g. `{"filter__Name__contains": "ada", ' +
    '"filter__Age__higher_than": 30}`. Keys must start with `filter__`. With field names off, use ' +
    "the field id — `filter__field_4321__contains`. Combine them with Filter type.",
};

export const filterTypeParam: Param = {
  key: "filterType",
  label: "Filter type",
  type: "select",
  options: [
    { value: "AND", label: "AND — a row must match every filter" },
    { value: "OR", label: "OR — a row need match only one" },
  ],
  hint: "How the Field filters combine. Baserow defaults to AND.",
};
