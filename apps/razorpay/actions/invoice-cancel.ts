import type { ActionDefinition } from "@w6w/types";
import { RazorpayClient } from "../lib/client.ts";
import { invoiceIdParam } from "../lib/params.ts";

/** `POST /v1/invoices/{id}/cancel` — cancel a draft or issued invoice. */
interface Input {
  id: string;
}

const invoiceCancel: ActionDefinition<Input> = {
  key: "invoice-cancel",
  type: "perform",
  resource: "invoice",
  title: "Cancel Invoice",
  description: "Cancel a draft or issued invoice.",
  idempotent: true,
  params: [invoiceIdParam()],
  output: [
    { key: "id", type: "string", label: "Invoice ID" },
    { key: "status", type: "string", label: "Now 'cancelled' on success" },
  ],

  async execute(input, ctx) {
    return await new RazorpayClient(ctx).post(`/invoices/${encodeURIComponent(input.id)}/cancel`);
  },
};

export default invoiceCancel;
