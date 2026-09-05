import type { ActionDefinition } from "@w6w/types";
import { compact, RechargeClient } from "../lib/client.ts";
import { customerIdParam } from "../lib/params.ts";

interface Input {
  customerId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  taxExempt?: boolean;
}

/**
 * `PUT /customers/{id}` — update a customer. Scope: `write_customers`.
 * `phone` must be E.164, per the reference. Response envelope:
 * `{"customer": {...}}`. Updating the same fields to the same values twice is
 * a no-op on the server, so this is safe to retry.
 */
const customerUpdate: ActionDefinition<Input> = {
  key: "customer-update",
  type: "perform",
  resource: "customer",
  title: "Update Customer",
  description: "Modify an existing customer's profile fields. Only the fields provided are " +
    "changed.",
  idempotent: true,
  params: [
    customerIdParam,
    { key: "email", label: "Email", type: "string" },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "phone", label: "Phone", type: "string", hint: "E.164 format, e.g. +16175551212." },
    { key: "taxExempt", label: "Tax exempt", type: "boolean" },
  ],
  output: [
    { key: "id", type: "number", label: "Customer ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],

  async execute(input, ctx) {
    const client = new RechargeClient(ctx);
    return await client.single(
      `/customers/${encodeURIComponent(input.customerId)}`,
      "customer",
      {
        method: "PUT",
        body: compact({
          email: input.email,
          first_name: input.firstName,
          last_name: input.lastName,
          phone: input.phone,
          tax_exempt: input.taxExempt,
        }),
      },
    );
  },
};

export default customerUpdate;
