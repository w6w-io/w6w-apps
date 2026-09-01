import type { ActionDefinition } from "@w6w/types";
import { RazorpayClient } from "../lib/client.ts";
import { invoiceIdParam } from "../lib/params.ts";

/**
 * `POST /v1/invoices/{id}/issue` — transition a draft invoice to `issued`,
 * notifying the customer with the payment link. Once issued, line items can
 * no longer be changed.
 */
interface Input {
  id: string;
}

const invoiceIssue: ActionDefinition<Input> = {
  key: "invoice-issue",
  type: "perform",
  resource: "invoice",
  title: "Issue Invoice",
  description:
    "Transition a draft invoice to issued, notifying the customer. Line items are locked after.",
  idempotent: true,
  params: [invoiceIdParam()],
  output: [
    { key: "id", type: "string", label: "Invoice ID" },
    { key: "status", type: "string", label: "Now 'issued' on success" },
    { key: "short_url", type: "string", label: "Now active hosted payment page URL" },
  ],

  async execute(input, ctx) {
    return await new RazorpayClient(ctx).post(`/invoices/${encodeURIComponent(input.id)}/issue`);
  },
};

export default invoiceIssue;
