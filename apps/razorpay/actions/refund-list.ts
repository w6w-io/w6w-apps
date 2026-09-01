import { compact, RazorpayClient } from "../lib/client.ts";
import type { ActionDefinition } from "@w6w/types";
import { dateRangeParams, paginationParams } from "../lib/params.ts";

/** `GET /v1/refunds` — a paginated list of all refunds across every payment. */
interface Input {
  from?: number;
  to?: number;
  count?: number;
  skip?: number;
}

const refundList: ActionDefinition<Input> = {
  key: "refund-list",
  type: "search",
  resource: "refund",
  title: "List Refunds",
  description: "Retrieve a paginated list of all refunds across payments. Maximum 100 per call.",
  params: [...dateRangeParams(), ...paginationParams()],
  output: [
    { key: "count", type: "number", label: "Number of items in this page" },
    { key: "items", type: "array", label: "Refunds" },
  ],

  async execute(input, ctx) {
    return await new RazorpayClient(ctx).get(
      "/refunds",
      compact({ from: input.from, to: input.to, count: input.count, skip: input.skip }),
    );
  },
};

export default refundList;
