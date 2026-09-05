import type { ActionDefinition } from "@w6w/types";
import { RechargeClient } from "../lib/client.ts";
import { customerIdParam } from "../lib/params.ts";

interface Input {
  customerId: string;
}

/**
 * `GET /customers/{id}` — retrieve one customer. Scope: `read_customers`.
 * Response envelope: `{"customer": {...}}`.
 */
const customerGet: ActionDefinition<Input> = {
  key: "customer-get",
  type: "read",
  resource: "customer",
  title: "Get Customer",
  description: "Retrieve one customer by its Recharge customer id.",
  params: [customerIdParam],
  output: [
    { key: "id", type: "number", label: "Customer ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "phone", type: "string", label: "Phone" },
    { key: "hash", type: "string", label: "Recharge customer hash" },
    { key: "external_customer_id", type: "object", label: "External customer id" },
    { key: "subscriptions_active_count", type: "number", label: "Active subscriptions" },
    { key: "subscriptions_total_count", type: "number", label: "Total subscriptions" },
    { key: "has_valid_payment_method", type: "boolean", label: "Has a valid payment method" },
    {
      key: "has_payment_method_in_dunning",
      type: "boolean",
      label: "Payment method is in dunning",
    },
    { key: "tax_exempt", type: "boolean", label: "Tax exempt" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],

  async execute(input, ctx) {
    const client = new RechargeClient(ctx);
    return await client.single(`/customers/${encodeURIComponent(input.customerId)}`, "customer");
  },
};

export default customerGet;
