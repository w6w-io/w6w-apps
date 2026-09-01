import { compact, RazorpayClient } from "../lib/client.ts";
import type { ActionDefinition } from "@w6w/types";
import { customerIdParam } from "../lib/params.ts";

/**
 * `PUT /v1/customers/{id}` — update a customer's name, email, or contact.
 * The email/contact combination must remain unique.
 */
interface Input {
  id: string;
  name?: string;
  contact?: string;
  email?: string;
}

const customerUpdate: ActionDefinition<Input> = {
  key: "customer-update",
  type: "perform",
  resource: "customer",
  title: "Update Customer",
  description:
    "Update a customer's name, email, or contact. The email/contact pair must stay unique.",
  idempotent: true,
  params: [
    customerIdParam(),
    { key: "name", label: "Name", type: "string", hint: "3-50 characters." },
    {
      key: "contact",
      label: "Phone",
      type: "string",
      hint: "Minimum 8 digits including country code.",
    },
    { key: "email", label: "Email", type: "string", hint: "Maximum 64 characters." },
  ],
  output: [
    { key: "id", type: "string", label: "Customer ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "contact", type: "string", label: "Phone" },
    { key: "email", type: "string", label: "Email" },
  ],

  async execute(input, ctx) {
    return await new RazorpayClient(ctx).put(
      `/customers/${encodeURIComponent(input.id)}`,
      compact({ name: input.name, contact: input.contact, email: input.email }),
    );
  },
};

export default customerUpdate;
