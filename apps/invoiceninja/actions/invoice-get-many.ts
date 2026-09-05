import type { ActionDefinition } from "@w6w/types";
import { InvoiceNinjaClient } from "../lib/client.ts";
import { pagination, statusFilter } from "../lib/params.ts";

interface Input {
  clientId?: string;
  status?: string[];
  page?: number;
  perPage?: number;
}

/** `GET /api/v1/invoices` — verified against `getInvoices`. */
const invoiceGetMany: ActionDefinition<Input> = {
  key: "invoice-get-many",
  type: "search",
  resource: "invoice",
  title: "List Invoices",
  description: "List invoices, optionally scoped to one client.",
  params: [
    { key: "clientId", label: "Client ID", type: "string" },
    statusFilter,
    ...pagination,
  ],
  output: [{ key: "data", type: "array", label: "Invoices" }],

  execute(input, ctx) {
    return new InvoiceNinjaClient(ctx).request("/invoices", {
      query: {
        client_id: input.clientId,
        status: input.status?.length ? input.status.join(",") : undefined,
        page: input.page,
        per_page: input.perPage,
      },
    });
  },
};

export default invoiceGetMany;
