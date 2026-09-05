import type { Param } from "@w6w/types";

/**
 * Every action here is one call on `/api/resource/:doctype` — the DocType
 * name is the one thing every generic action shares.
 */
export const DOCTYPE_PARAM: Param = {
  key: "doctype",
  label: "DocType",
  type: "string",
  required: true,
  placeholder: "Customer",
  hint: "The exact DocType name, as it appears in the ERPNext/Frappe desk — e.g. `Customer`, " +
    "`Sales Order`, `Item`, `Lead`, `Employee`. Case- and space-sensitive.",
};

/** The `name` field — Frappe's primary key for every DocType, not a display name. */
export const NAME_PARAM: Param = {
  key: "name",
  label: "Document Name",
  type: "string",
  required: true,
  hint: "The document's `name` field — Frappe's primary key, e.g. `SAL-ORD-2026-00042`. This is " +
    "usually NOT the same as a human-readable title field like `customer_name`.",
};

export const FILTERS_PARAM: Param = {
  key: "filters",
  label: "Filters",
  type: "json",
  hint: "JSON array of `[fieldname, operator, value]` triples, e.g. " +
    '`[["status","=","Open"],["grand_total",">",1000]]`. Combined with AND. Leave empty to ' +
    "match every record this User may read.",
};

export const OR_FILTERS_PARAM: Param = {
  key: "orFilters",
  label: "Or Filters",
  type: "json",
  hint: "Same shape as Filters, but combined with OR instead of AND.",
};

export const FIELDS_PARAM: Param = {
  key: "fields",
  label: "Fields",
  type: "string",
  hint: "Comma-separated field names to return, e.g. `customer_name,territory,email_id`. Leave " +
    "empty to let Frappe return only `name` for a list, or every field for a single read.",
};

export const ORDER_BY_PARAM: Param = {
  key: "orderBy",
  label: "Sort Order",
  type: "string",
  placeholder: "modified desc",
  hint: "`fieldname asc` or `fieldname desc`.",
};

export const LIMIT_START_PARAM: Param = {
  key: "limitStart",
  label: "Limit Start",
  type: "number",
  hint: "Records to skip, for paging through a large result set.",
};

export const LIMIT_PAGE_LENGTH_PARAM: Param = {
  key: "limitPageLength",
  label: "Limit Page Length",
  type: "number",
  hint: "Maximum records to return. Frappe defaults to 20 when this is left empty.",
};

/** The `output` fragment every record-listing action reuses. */
export const RECORDS_OUTPUT = [
  { key: "records", type: "array" as const, label: "Records" },
  { key: "count", type: "number" as const, label: "Number of records returned" },
];

/** Split the comma-separated `fields` form value into the JSON array Frappe expects. */
export function splitFields(fields: string | undefined): string[] | undefined {
  if (!fields) return undefined;
  const list = fields.split(",").map((f) => f.trim()).filter(Boolean);
  return list.length > 0 ? list : undefined;
}
