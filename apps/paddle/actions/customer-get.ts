import type { ActionDefinition } from "@w6w/types";
import { PaddleClient } from "../lib/client.ts";

/** `GET /customers/{customer_id}` — one customer by Paddle ID. */
interface Input {
  customerId: string;
}

const customerGet: ActionDefinition<Input> = {
  key: "customer-get",
  type: "read",
  resource: "customer",
  title: "Get Customer",
  description: "Fetch a single customer by their Paddle ID.",
  params: [
    {
      key: "customerId",
      label: "Customer ID",
      type: "string",
      required: true,
      placeholder: "ctm_01hv6y1jedq4p1n0yqn5ba3ky4",
      validation: { pattern: "^ctm_[a-z0-9]{26}$" },
      hint: "To look one up by email address instead, use List Customers.",
    },
  ],
  output: [{ key: "data", type: "object", label: "Customer" }],

  execute(input, ctx) {
    return new PaddleClient(ctx).request(`/customers/${encodeURIComponent(input.customerId)}`);
  },
};

export default customerGet;
