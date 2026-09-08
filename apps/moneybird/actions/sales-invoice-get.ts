import type { ActionDefinition } from "@w6w/types";
import { MoneybirdClient, resolveAdministrationId } from "../lib/client.ts";
import { administrationIdParam, idParam } from "../lib/params.ts";

interface Input {
  administrationId?: string;
  id: string;
}

/** `GET /:administration_id/sales_invoices/:id.json` — full detail, including line items and totals. */
const salesInvoiceGet: ActionDefinition<Input> = {
  key: "sales-invoice-get",
  type: "read",
  resource: "sales_invoice",
  title: "Get Sales Invoice",
  description: "Retrieve one sales invoice by its Moneybird id, including line items and totals.",
  params: [administrationIdParam, idParam("Sales Invoice ID")],
  output: [
    { key: "id", type: "string", label: "Sales invoice ID" },
    { key: "invoice_id", type: "string", label: "Invoice number" },
    { key: "state", type: "string", label: "State" },
    { key: "total_price_incl_tax", type: "string", label: "Total (incl. tax)" },
    { key: "total_unpaid", type: "string", label: "Total unpaid" },
  ],

  execute(input, ctx) {
    const administrationId = resolveAdministrationId(ctx, input.administrationId);
    return new MoneybirdClient(ctx, administrationId).request(
      `/sales_invoices/${encodeURIComponent(input.id)}`,
    );
  },
};

export default salesInvoiceGet;
