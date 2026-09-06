import type { ActionDefinition } from "@w6w/types";
import { MoneybirdClient, resolveAdministrationId } from "../lib/client.ts";
import { administrationIdParam, paginationParams } from "../lib/params.ts";

interface Input {
  administrationId?: string;
  filter?: string;
  page?: number;
  perPage?: number;
}

/**
 * `GET /:administration_id/sales_invoices.json`.
 *
 * `filter` is `key:value` pairs separated by commas, e.g.
 * `state:open,period:this_month` — and it REPLACES the defaults entirely
 * rather than narrowing them, so a filter that only sets `state` still gets
 * the default `period:this_year` window unless `period` is included too. To
 * see every draft ever created regardless of age, pass `state:draft` with no
 * `period` at all (a draft with no invoice date is only matched by a period
 * that contains today).
 */
const salesInvoiceList: ActionDefinition<Input> = {
  key: "sales-invoice-list",
  type: "read",
  resource: "sales_invoice",
  title: "List Sales Invoices",
  description: "List sales invoices in an administration, filtered by state and/or period.",
  params: [
    administrationIdParam,
    {
      key: "filter",
      label: "Filter",
      type: "string",
      hint: 'Comma-separated key:value pairs, e.g. "state:open,period:this_month". Replaces the ' +
        "API's defaults (state:all, period:this_year) entirely — include every key you need. " +
        "Available states: all, draft, open, scheduled, pending_payment, late, reminded, paid, " +
        "uncollectible.",
    },
    ...paginationParams(),
  ],
  output: [{ key: "items", type: "array", label: "Sales invoices" }],

  async execute(input, ctx) {
    const administrationId = resolveAdministrationId(ctx, input.administrationId);
    const items = await new MoneybirdClient(ctx, administrationId).request<unknown[]>(
      "/sales_invoices",
      { query: { filter: input.filter, page: input.page, per_page: input.perPage } },
    );
    return { items: items ?? [] };
  },
};

export default salesInvoiceList;
