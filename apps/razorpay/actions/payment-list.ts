import { compact, RazorpayClient } from "../lib/client.ts";
import type { ActionDefinition } from "@w6w/types";
import { dateRangeParams, paginationParams } from "../lib/params.ts";

/** `GET /v1/payments` — a paginated list of payments. Maximum 100 per call. */
interface Input {
  from?: number;
  to?: number;
  count?: number;
  skip?: number;
}

const paymentList: ActionDefinition<Input> = {
  key: "payment-list",
  type: "search",
  resource: "payment",
  title: "List Payments",
  description: "Retrieve a paginated list of payments. Maximum 100 per call.",
  params: [...dateRangeParams(), ...paginationParams()],
  output: [
    { key: "count", type: "number", label: "Number of items in this page" },
    { key: "items", type: "array", label: "Payments" },
  ],

  async execute(input, ctx) {
    return await new RazorpayClient(ctx).get(
      "/payments",
      compact({ from: input.from, to: input.to, count: input.count, skip: input.skip }),
    );
  },
};

export default paymentList;
