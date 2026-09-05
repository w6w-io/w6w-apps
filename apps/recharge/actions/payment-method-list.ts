import type { ActionDefinition } from "@w6w/types";
import { compact, RechargeClient } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

interface Input {
  customerId?: string;
  limit?: number;
  cursor?: string;
}

/**
 * `GET /payment_methods` — list payment methods. Scope:
 * `read_payment_methods`. Response envelope: `{"payment_methods": [...]}`.
 *
 * Per the reference's own documented `payment_details` shape, only
 * `brand`/`last4`/`exp_month`/`exp_year` are ever returned — no full card
 * number, in this response or any other endpoint in the Recharge API.
 * `processor_customer_token` / `processor_payment_method_token` are the
 * PAYMENT PROCESSOR's own tokenized references (e.g. Stripe `cus_…`/`pm_…`);
 * they are meaningless without that processor's own secret API key, which
 * this app never holds, so they are returned as documented rather than
 * stripped.
 */
const paymentMethodList: ActionDefinition<Input> = {
  key: "payment-method-list",
  type: "read",
  resource: "payment-method",
  title: "List Payment Methods",
  description: "Return a list of payment methods in the store, or for one customer.",
  params: [
    { key: "customerId", label: "Customer ID", type: "string" },
    ...paginationParams(50),
  ],
  output: [
    { key: "items", type: "array", label: "Payment methods" },
    { key: "nextCursor", type: "string", label: "Cursor for the next page" },
    { key: "previousCursor", type: "string", label: "Cursor for the previous page" },
  ],

  async execute(input, ctx) {
    const client = new RechargeClient(ctx);
    const page = await client.list("/payment_methods", "payment_methods", {
      query: compact({ customer_id: input.customerId, limit: input.limit, cursor: input.cursor }),
    });
    return { items: page.items, nextCursor: page.nextCursor, previousCursor: page.previousCursor };
  },
};

export default paymentMethodList;
