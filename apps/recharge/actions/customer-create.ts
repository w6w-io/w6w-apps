import type { ActionDefinition } from "@w6w/types";
import { compact, RechargeClient } from "../lib/client.ts";

interface Input {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  taxExempt?: boolean;
  externalCustomerId?: string;
}

/**
 * `POST /customers` — create a customer. Scope: `write_customers`
 * (`write_payment_methods` too, but only when a payment token is included —
 * this action never sends one; card data must be a tokenized processor
 * representation, never raw card details, per the reference's own note).
 *
 * `phone` must be E.164 (e.g. `+16175551212`), per the reference.
 * Response envelope: `{"customer": {...}}`.
 */
const customerCreate: ActionDefinition<Input> = {
  key: "customer-create",
  type: "perform",
  resource: "customer",
  title: "Create Customer",
  description: "Create a customer in Recharge. Does not create the customer on any other " +
    "connected platform.",
  idempotent: false,
  params: [
    { key: "email", label: "Email", type: "string", required: true },
    { key: "firstName", label: "First name", type: "string", required: true },
    { key: "lastName", label: "Last name", type: "string", required: true },
    {
      key: "phone",
      label: "Phone",
      type: "string",
      hint: "E.164 format, e.g. +16175551212.",
    },
    { key: "taxExempt", label: "Tax exempt", type: "boolean" },
    {
      key: "externalCustomerId",
      label: "External customer ID (ecommerce)",
      type: "string",
      hint: "Stored as external_customer_id.ecommerce on the created customer.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Customer ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "hash", type: "string", label: "Recharge customer hash" },
    { key: "created_at", type: "string", label: "Created at" },
  ],

  async execute(input, ctx) {
    const client = new RechargeClient(ctx);
    return await client.single("/customers", "customer", {
      method: "POST",
      body: compact({
        email: input.email,
        first_name: input.firstName,
        last_name: input.lastName,
        phone: input.phone,
        tax_exempt: input.taxExempt,
        external_customer_id: input.externalCustomerId
          ? { ecommerce: input.externalCustomerId }
          : undefined,
      }),
    });
  },
};

export default customerCreate;
