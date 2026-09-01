import type { ActionDefinition } from "@w6w/types";
import { RazorpayClient } from "../lib/client.ts";
import { paymentIdParam } from "../lib/params.ts";

/**
 * `GET /v1/payments/{id}` — retrieve a payment's full details and current
 * status. The vendor's own note: always re-fetch before acting on it, since
 * status can change between an authorization webhook and a later capture.
 */
interface Input {
  id: string;
}

const paymentGet: ActionDefinition<Input> = {
  key: "payment-get",
  type: "read",
  resource: "payment",
  title: "Get Payment",
  description: "Fetch a payment's full details and current status.",
  params: [paymentIdParam()],
  output: [
    { key: "id", type: "string", label: "Payment ID" },
    { key: "amount", type: "number", label: "Amount (sub-unit)" },
    { key: "currency", type: "string", label: "Currency" },
    { key: "status", type: "string", label: "created | authorized | captured | refunded | failed" },
    { key: "order_id", type: "string", label: "Associated order ID" },
    { key: "method", type: "string", label: "card | netbanking | wallet | emi | upi" },
    { key: "amount_refunded", type: "number", label: "Total refunded (sub-unit)" },
    { key: "captured", type: "boolean", label: "Whether captured" },
    { key: "email", type: "string", label: "Payer email" },
    { key: "contact", type: "string", label: "Payer phone" },
    { key: "error_code", type: "string", label: "Error code, when failed" },
    { key: "error_description", type: "string", label: "Error description, when failed" },
    { key: "created_at", type: "number", label: "Created (Unix timestamp)" },
  ],

  async execute(input, ctx) {
    return await new RazorpayClient(ctx).get(`/payments/${encodeURIComponent(input.id)}`);
  },
};

export default paymentGet;
