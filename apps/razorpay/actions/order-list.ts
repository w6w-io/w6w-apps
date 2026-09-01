import type { ActionDefinition } from "@w6w/types";
import { compact, RazorpayClient } from "../lib/client.ts";
import { dateRangeParams, paginationParams } from "../lib/params.ts";

/** `GET /v1/orders` — a paginated list of orders, oldest first. */
interface Input {
  from?: number;
  to?: number;
  count?: number;
  skip?: number;
  authorized?: boolean;
  receipt?: string;
}

const orderList: ActionDefinition<Input> = {
  key: "order-list",
  type: "search",
  resource: "order",
  title: "List Orders",
  description: "Retrieve a paginated list of orders. Maximum 100 per call.",
  params: [
    ...dateRangeParams(),
    ...paginationParams(),
    {
      key: "authorized",
      label: "Only orders with authorized payments",
      type: "boolean",
      advanced: true,
    },
    { key: "receipt", label: "Receipt", type: "string", hint: "Filter by receipt value." },
  ],
  output: [
    { key: "count", type: "number", label: "Number of items in this page" },
    { key: "items", type: "array", label: "Orders" },
  ],

  async execute(input, ctx) {
    return await new RazorpayClient(ctx).get(
      "/orders",
      compact({
        from: input.from,
        to: input.to,
        count: input.count,
        skip: input.skip,
        authorized: input.authorized === undefined ? undefined : input.authorized ? 1 : 0,
        receipt: input.receipt,
      }),
    );
  },
};

export default orderList;
