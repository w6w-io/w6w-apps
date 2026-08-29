import type { ActionDefinition } from "@w6w/types";
import { GorgiasClient } from "../lib/client.ts";

interface Input {
  customerId: number;
}

const customerDelete: ActionDefinition<Input> = {
  key: "customer-delete",
  type: "perform",
  resource: "customer",
  title: "Delete Customer",
  description: "Permanently delete a customer.",
  // Deleting an already-deleted customer 404s rather than erroring on a
  // duplicate call, so retrying converges on the same end state.
  idempotent: true,
  params: [
    { key: "customerId", label: "Customer ID", type: "number", required: true },
  ],
  output: [],

  async execute(input, ctx) {
    await new GorgiasClient(ctx).request(`/customers/${input.customerId}`, { method: "DELETE" });
    return {};
  },
};

export default customerDelete;
