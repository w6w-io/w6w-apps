import type { ActionDefinition } from "@w6w/types";
import { LemonSqueezyClient } from "../lib/client.ts";
import { includeParam } from "../lib/params.ts";

/** `GET /v1/customers/:id`. */
interface Input {
  customerId: string;
  include?: string;
}

const customerGet: ActionDefinition<Input> = {
  key: "customer-get",
  type: "read",
  resource: "customer",
  title: "Get Customer",
  description: "Retrieve a single customer by ID.",
  params: [
    { key: "customerId", label: "Customer ID", type: "string", required: true },
    includeParam,
  ],
  output: [{ key: "data", type: "object", label: "The Customer object" }],

  execute(input, ctx) {
    return new LemonSqueezyClient(ctx).request(
      `/customers/${encodeURIComponent(input.customerId)}`,
      { query: { include: input.include } },
    );
  },
};

export default customerGet;
