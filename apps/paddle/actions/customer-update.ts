import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, PaddleClient } from "../lib/client.ts";
import { customDataParam, entityStatusOptions } from "../lib/params.ts";

/**
 * `PATCH /customers/{customer_id}` — update a customer, or archive them.
 *
 * Customers cannot be deleted — Paddle retains them for record-keeping — so
 * archiving through `status` is the supported way to retire one.
 *
 * Idempotent: re-sending the same patch converges on the same entity.
 */
interface Input {
  customerId: string;
  name?: string;
  email?: string;
  status?: string;
  locale?: string;
  customData?: unknown;
}

const customerUpdate: ActionDefinition<Input> = {
  key: "customer-update",
  type: "perform",
  resource: "customer",
  title: "Update Customer",
  description: "Update a customer's details, or archive them by setting their status.",
  idempotent: true,
  params: [
    {
      key: "customerId",
      label: "Customer ID",
      type: "string",
      required: true,
      validation: { pattern: "^ctm_[a-z0-9]{26}$" },
    },
    { key: "name", label: "Name", type: "string", validation: { maxLength: 1024 } },
    { key: "email", label: "Email", type: "string", validation: { minLength: 1, maxLength: 320 } },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: entityStatusOptions,
      hint: "Customers cannot be deleted. Set `archived` to retire one.",
    },
    { key: "locale", label: "Locale", type: "string" },
    customDataParam,
  ],
  output: [{ key: "data", type: "object", label: "The updated customer" }],

  execute(input, ctx) {
    return new PaddleClient(ctx).request(`/customers/${encodeURIComponent(input.customerId)}`, {
      method: "PATCH",
      body: compact({
        name: input.name,
        email: input.email,
        status: input.status,
        locale: input.locale,
        custom_data: asOptionalJson(input.customData, "Custom data"),
      }),
    });
  },
};

export default customerUpdate;
