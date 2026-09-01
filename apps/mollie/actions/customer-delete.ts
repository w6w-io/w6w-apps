import type { ActionDefinition } from "@w6w/types";
import { compact, MollieClient } from "../lib/client.ts";
import { customerIdParam, testmodeParam } from "../lib/params.ts";

/**
 * `DELETE /v2/customers/{id}` — permanently delete a customer and all its
 * mandates and subscriptions. Payments already made are unaffected, but lose
 * their link to the customer.
 */
interface Input {
  customerId: string;
  testmode?: boolean;
}

const customerDelete: ActionDefinition<Input> = {
  key: "customer-delete",
  type: "perform",
  resource: "customer",
  title: "Delete Customer",
  description:
    "Permanently delete a customer, and all mandates and subscriptions belonging to it. Cannot " +
    "be undone.",
  idempotent: true,
  params: [customerIdParam(), testmodeParam],
  output: [
    { key: "customerId", type: "string", label: "Customer ID" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    await new MollieClient(ctx).delete(
      `/customers/${encodeURIComponent(input.customerId)}`,
      compact({ testmode: input.testmode }),
    );
    return { customerId: input.customerId, deleted: true };
  },
};

export default customerDelete;
