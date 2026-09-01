import type { ActionDefinition } from "@w6w/types";
import { RazorpayClient } from "../lib/client.ts";
import { paymentLinkIdParam } from "../lib/params.ts";

/** `GET /v1/payment_links/{id}` — a payment link's full details. */
interface Input {
  id: string;
}

const paymentLinkGet: ActionDefinition<Input> = {
  key: "payment-link-get",
  type: "read",
  resource: "payment-link",
  title: "Get Payment Link",
  description: "Fetch a specific payment link's full details.",
  params: [paymentLinkIdParam()],
  output: [
    { key: "id", type: "string", label: "Payment Link ID" },
    { key: "short_url", type: "string", label: "Shareable URL" },
    { key: "amount", type: "number", label: "Amount (sub-unit)" },
    { key: "amount_paid", type: "number", label: "Amount paid so far" },
    {
      key: "status",
      type: "string",
      label: "created | partially_paid | expired | cancelled | paid",
    },
    { key: "reference_id", type: "string", label: "Your tracking reference" },
  ],

  async execute(input, ctx) {
    return await new RazorpayClient(ctx).get(`/payment_links/${encodeURIComponent(input.id)}`);
  },
};

export default paymentLinkGet;
