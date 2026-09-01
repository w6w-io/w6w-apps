import type { ActionDefinition } from "@w6w/types";
import { RazorpayClient } from "../lib/client.ts";
import { invoiceIdParam } from "../lib/params.ts";

/** `GET /v1/invoices/{id}` — an invoice's full details. */
interface Input {
  id: string;
}

const invoiceGet: ActionDefinition<Input> = {
  key: "invoice-get",
  type: "read",
  resource: "invoice",
  title: "Get Invoice",
  description: "Fetch a specific invoice's full details.",
  params: [invoiceIdParam()],
  output: [
    { key: "id", type: "string", label: "Invoice ID" },
    { key: "invoice_number", type: "string", label: "Auto-generated invoice number" },
    {
      key: "status",
      type: "string",
      label: "draft | issued | partially_paid | paid | cancelled | expired",
    },
    { key: "short_url", type: "string", label: "Hosted payment page URL" },
    { key: "amount", type: "number", label: "Total amount (sub-unit)" },
    { key: "amount_paid", type: "number", label: "Amount received so far" },
    { key: "amount_due", type: "number", label: "Amount still due" },
    { key: "payment_id", type: "string", label: "Payment ID once paid" },
  ],

  async execute(input, ctx) {
    return await new RazorpayClient(ctx).get(`/invoices/${encodeURIComponent(input.id)}`);
  },
};

export default invoiceGet;
