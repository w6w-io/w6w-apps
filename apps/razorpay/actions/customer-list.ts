import { compact, RazorpayClient } from "../lib/client.ts";
import type { ActionDefinition } from "@w6w/types";
import { paginationParams } from "../lib/params.ts";

/** `GET /v1/customers` — a paginated list of all customers. No date-range filter. */
interface Input {
  count?: number;
  skip?: number;
}

const customerList: ActionDefinition<Input> = {
  key: "customer-list",
  type: "search",
  resource: "customer",
  title: "List Customers",
  description: "Retrieve a paginated list of all customers. Maximum 100 per call.",
  params: paginationParams(),
  output: [
    { key: "count", type: "number", label: "Number of items in this page" },
    { key: "items", type: "array", label: "Customers" },
  ],

  async execute(input, ctx) {
    return await new RazorpayClient(ctx).get(
      "/customers",
      compact({ count: input.count, skip: input.skip }),
    );
  },
};

export default customerList;
