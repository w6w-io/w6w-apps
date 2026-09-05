import type { ActionDefinition } from "@w6w/types";
import { ErpNextClient, toFilters } from "../lib/client.ts";
import {
  DOCTYPE_PARAM,
  FIELDS_PARAM,
  FILTERS_PARAM,
  LIMIT_PAGE_LENGTH_PARAM,
  LIMIT_START_PARAM,
  OR_FILTERS_PARAM,
  ORDER_BY_PARAM,
  RECORDS_OUTPUT,
  splitFields,
} from "../lib/params.ts";

interface Input {
  doctype: string;
  filters?: unknown;
  orFilters?: unknown;
  fields?: string;
  orderBy?: string;
  limitStart?: number;
  limitPageLength?: number;
}

/**
 * `GET /api/resource/:doctype` — list any DocType.
 *
 * This is Frappe's one generic list endpoint, shared by every DocType a site
 * has installed. Verified against `docs.frappe.io/framework/user/en/api/rest`
 * (fetched 2026-09-05): by default it returns 20 records and only the `name`
 * field, which is why `fields` is the param most workflows will also set.
 *
 * `limit_page_length` doubles as `limit` on Version 13, per the same
 * documentation; this action always sends the full `limit_page_length` name so
 * it works identically on every version Frappe still supports.
 */
const listDocuments: ActionDefinition<Input> = {
  key: "list-documents",
  type: "read",
  title: "List Documents",
  description: "List records of any DocType — Customer, Sales Order, Item, Lead, or any other " +
    "DocType this site has installed — with Frappe's own filter, field-selection, sort and " +
    "paging parameters.",
  params: [
    DOCTYPE_PARAM,
    FILTERS_PARAM,
    OR_FILTERS_PARAM,
    FIELDS_PARAM,
    ORDER_BY_PARAM,
    LIMIT_START_PARAM,
    LIMIT_PAGE_LENGTH_PARAM,
  ],
  output: RECORDS_OUTPUT,

  async execute(input, ctx) {
    const query: Record<string, unknown> = {
      filters: toFilters(input.filters, "Filters"),
      or_filters: toFilters(input.orFilters, "Or Filters"),
      fields: splitFields(input.fields),
      order_by: input.orderBy,
      limit_start: input.limitStart,
      limit_page_length: input.limitPageLength,
    };
    const body = await new ErpNextClient(ctx).resource<{ data: Record<string, unknown>[] }>(
      `/${encodeURIComponent(input.doctype)}`,
      { query },
    );
    const records = body?.data ?? [];
    return { records, count: records.length };
  },
};

export default listDocuments;
