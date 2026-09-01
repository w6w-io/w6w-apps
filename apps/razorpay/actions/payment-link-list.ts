import { compact, RazorpayClient } from "../lib/client.ts";
import type { ActionDefinition } from "@w6w/types";

/** `GET /v1/payment_links` — filter by the payment or your own reference id. */
interface Input {
  paymentId?: string;
  referenceId?: string;
}

const paymentLinkList: ActionDefinition<Input> = {
  key: "payment-link-list",
  type: "search",
  resource: "payment-link",
  title: "List Payment Links",
  description: "Retrieve payment links, optionally filtered by payment ID or your reference ID.",
  params: [
    {
      key: "paymentId",
      label: "Payment ID",
      type: "string",
      hint: "Filter by associated payment ID.",
    },
    {
      key: "referenceId",
      label: "Reference ID",
      type: "string",
      hint: "Filter by your custom reference number.",
    },
  ],
  output: [
    { key: "count", type: "number", label: "Number of items" },
    { key: "payment_links", type: "array", label: "Payment links" },
  ],

  async execute(input, ctx) {
    return await new RazorpayClient(ctx).get(
      "/payment_links",
      compact({ payment_id: input.paymentId, reference_id: input.referenceId }),
    );
  },
};

export default paymentLinkList;
