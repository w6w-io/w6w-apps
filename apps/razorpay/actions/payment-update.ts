import type { ActionDefinition } from "@w6w/types";
import { RazorpayClient } from "../lib/client.ts";
import { notesParam, paymentIdParam } from "../lib/params.ts";

/** `PATCH /v1/payments/{id}` — only `notes` can be modified after a payment is created. */
interface Input {
  id: string;
  notes: unknown;
}

const paymentUpdate: ActionDefinition<Input> = {
  key: "payment-update",
  type: "perform",
  resource: "payment",
  title: "Update Payment Notes",
  description: "Update a payment's notes. Only notes can be modified after creation.",
  idempotent: true,
  params: [paymentIdParam(), { ...notesParam, required: true, advanced: false }],
  output: [
    { key: "id", type: "string", label: "Payment ID" },
    { key: "notes", type: "object", label: "Updated notes" },
  ],

  async execute(input, ctx) {
    return await new RazorpayClient(ctx).patch(`/payments/${encodeURIComponent(input.id)}`, {
      notes: input.notes,
    });
  },
};

export default paymentUpdate;
