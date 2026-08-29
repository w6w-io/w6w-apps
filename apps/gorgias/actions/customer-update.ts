import type { ActionDefinition } from "@w6w/types";
import { GorgiasClient, unset } from "../lib/client.ts";
import { customerOutput } from "../lib/params.ts";

interface Input {
  customerId: number;
  email?: string;
  name?: string;
  externalId?: string;
  language?: string;
  timezone?: string;
}

/**
 * `PUT /customers/{id}` — the same inline request-body shape as
 * `create-customer` (developers.gorgias.com/reference/update-customer).
 * Partial: only the fields sent are changed
 * (developers.gorgias.com/reference/requests, "Partially updating objects").
 */
const customerUpdate: ActionDefinition<Input> = {
  key: "customer-update",
  type: "perform",
  resource: "customer",
  title: "Update Customer",
  description: "Update a customer. Only the fields you set are changed.",
  idempotent: true,
  params: [
    { key: "customerId", label: "Customer ID", type: "number", required: true },
    { key: "email", label: "Email", type: "string", row: "identity" },
    { key: "name", label: "Name", type: "string", row: "identity" },
    { key: "externalId", label: "External ID", type: "string", advanced: true },
    { key: "language", label: "Language", type: "string", advanced: true },
    { key: "timezone", label: "Timezone", type: "string", advanced: true },
  ],
  output: customerOutput,

  execute(input, ctx) {
    return new GorgiasClient(ctx).request(`/customers/${input.customerId}`, {
      method: "PUT",
      body: {
        email: unset(input.email),
        name: unset(input.name),
        external_id: unset(input.externalId),
        language: unset(input.language),
        timezone: unset(input.timezone),
      },
    });
  },
};

export default customerUpdate;
