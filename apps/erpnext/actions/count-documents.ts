import type { ActionDefinition } from "@w6w/types";
import { ErpNextClient, toFilters } from "../lib/client.ts";
import { DOCTYPE_PARAM, FILTERS_PARAM } from "../lib/params.ts";

interface Input {
  doctype: string;
  filters?: unknown;
}

/**
 * `GET /api/method/frappe.client.get_count` — count matching documents
 * without fetching them.
 *
 * `/api/resource` has no dedicated count endpoint or response header of its
 * own; Frappe's REST documentation only describes listing and paging. This
 * action instead calls `frappe.client.get_count`, a whitelisted method
 * bundled with the framework itself
 * (`@frappe.whitelist()` on `get_count(doctype, filters, debug, cache)`,
 * verified against `frappe/client.py`, `develop` branch, fetched 2026-09-05
 * — part of `frappe.client`, the module the REST layer's own `insert`/
 * `save`/`submit`/`cancel`/`delete` helpers live in, so it ships with every
 * install rather than being an ERPNext-specific add-on).
 *
 * It respects the same permission rules and `filters` grammar as List
 * Documents, so a bot User restricted by record-level permissions is counted
 * accordingly rather than seeing the whole table.
 */
const countDocuments: ActionDefinition<Input> = {
  key: "count-documents",
  type: "read",
  title: "Count Documents",
  description: "Count documents of any DocType matching a filter, using the framework's " +
    "`frappe.client.get_count`, without fetching the records themselves.",
  params: [DOCTYPE_PARAM, FILTERS_PARAM],
  output: [{ key: "count", type: "number", label: "Number of matching documents" }],

  async execute(input, ctx) {
    const count = await new ErpNextClient(ctx).method<number>("frappe.client.get_count", {
      query: {
        doctype: input.doctype,
        filters: toFilters(input.filters, "Filters"),
      },
    });
    return { count };
  },
};

export default countDocuments;
