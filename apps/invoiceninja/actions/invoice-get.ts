import type { ActionDefinition } from "@w6w/types";
import { InvoiceNinjaClient } from "../lib/client.ts";
import { invoiceOutput } from "../lib/params.ts";

interface Input {
  invoiceId: string;
}

/** `GET /api/v1/invoices/{id}` — verified against `showInvoice`. */
const invoiceGet: ActionDefinition<Input> = {
  key: "invoice-get",
  type: "read",
  resource: "invoice",
  title: "Get Invoice",
  description: "Retrieve a single invoice by hashed ID.",
  params: [
    { key: "invoiceId", label: "Invoice ID", type: "string", required: true },
  ],
  output: invoiceOutput,

  execute(input, ctx) {
    return new InvoiceNinjaClient(ctx).request(`/invoices/${input.invoiceId}`);
  },
};

export default invoiceGet;
