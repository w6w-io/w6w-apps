import type { Param } from "@w6w/types";

/**
 * Paging + filtering, shared by every Object Query list action.
 *
 * `filter` and `sort` take Zuora's own `field.OP:value` clause syntax (see
 * `lib/client.ts`'s module doc and the "Object Query" guide) rather than a
 * pile of per-field params — Object Query's filterable/sortable field set
 * differs per object and Zuora documents it per operation, so a fixed set of
 * typed filter params here would either omit fields Zuora supports or claim
 * support for fields it doesn't.
 */
export const LIST_PARAMS: Param[] = [
  {
    key: "filter",
    label: "Filter",
    type: "string",
    hint: "One or more `field.OP:value` clauses, comma-separated (e.g. `currency.EQ:USD," +
      "status.EQ:Active`). Operators: EQ, NE, LT, LE, GT, GE, SW (starts with), IN " +
      "(`name.IN:[Amy,Bella]`). Multiple clauses are ANDed together — Object Query has no OR.",
  },
  {
    key: "sort",
    label: "Sort",
    type: "string",
    hint: "One or more `field.ASC`/`field.DESC` clauses, comma-separated.",
    advanced: true,
  },
  {
    key: "fields",
    label: "Fields",
    type: "string",
    hint: "Comma-separated field names to return. Leave blank to return every field Zuora " +
      "has on the object — some of these objects have 50+ fields.",
    advanced: true,
  },
  {
    key: "returnAll",
    label: "Return All",
    type: "boolean",
    default: false,
    hint: "Page to the end, following Zuora's cursor.",
  },
  {
    key: "limit",
    label: "Limit",
    type: "number",
    default: 20,
    showIf: { "==": [{ var: "returnAll" }, false] },
    hint: "Zuora caps a single page at 99.",
  },
  {
    key: "maxPages",
    label: "Maximum Pages",
    type: "number",
    default: 20,
    advanced: true,
    showIf: { "==": [{ var: "returnAll" }, true] },
  },
];

/** Build `RequestOptions.filters` + `query` from the params above. */
export function listOptions(
  p: Record<string, unknown>,
): { filters: string[]; query: Record<string, string> } {
  const filters = String(p.filter ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const query: Record<string, string> = {};
  const sort = String(p.sort ?? "").trim();
  if (sort) query["sort[]"] = sort;
  const fields = String(p.fields ?? "").trim();
  if (fields) query["fields[]"] = fields;
  return { filters, query };
}
