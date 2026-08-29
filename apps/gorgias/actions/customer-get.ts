import type { ActionDefinition } from "@w6w/types";
import { GorgiasClient } from "../lib/client.ts";
import { customerOutput } from "../lib/params.ts";

interface Input {
  customerId: number;
}

const customerGet: ActionDefinition<Input> = {
  key: "customer-get",
  type: "read",
  resource: "customer",
  title: "Get Customer",
  description: "Retrieve a single customer by ID.",
  params: [
    { key: "customerId", label: "Customer ID", type: "number", required: true },
  ],
  output: customerOutput,

  execute(input, ctx) {
    return new GorgiasClient(ctx).request(`/customers/${input.customerId}`);
  },
};

export default customerGet;
