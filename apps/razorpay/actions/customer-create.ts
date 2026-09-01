import type { ActionDefinition } from "@w6w/types";
import { RazorpayClient } from "../lib/client.ts";
import { notesParam } from "../lib/params.ts";

/**
 * `POST /v1/customers` — create a customer profile.
 *
 * The combination of `email` and `contact` must be unique per account —
 * Razorpay rejects a duplicate pair rather than returning the existing
 * customer.
 */
interface Input {
  name: string;
  contact?: string;
  email?: string;
  gstin?: string;
  notes?: unknown;
}

const customerCreate: ActionDefinition<Input> = {
  key: "customer-create",
  type: "perform",
  resource: "customer",
  title: "Create Customer",
  description:
    "Create a customer profile. The combination of email and contact must be unique per account.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      hint:
        "3-50 characters. Allowed: alphanumeric, period, apostrophe, forward slash, @, parentheses.",
    },
    {
      key: "contact",
      label: "Phone",
      type: "string",
      placeholder: "+919876543210",
      hint: "Include country code. Minimum 8 digits, maximum 15 characters.",
    },
    { key: "email", label: "Email", type: "string", hint: "Maximum 64 characters." },
    { key: "gstin", label: "GSTIN", type: "string", advanced: true },
    notesParam,
  ],
  output: [
    { key: "id", type: "string", label: "Customer ID (cust_*)" },
    { key: "name", type: "string", label: "Name" },
    { key: "contact", type: "string", label: "Phone" },
    { key: "email", type: "string", label: "Email" },
    { key: "created_at", type: "number", label: "Created (Unix timestamp)" },
  ],

  async execute(input, ctx) {
    return await new RazorpayClient(ctx).post("/customers", {
      name: input.name,
      contact: input.contact,
      email: input.email,
      gstin: input.gstin,
      notes: input.notes,
    });
  },
};

export default customerCreate;
