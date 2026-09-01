import { compact, RazorpayClient } from "../lib/client.ts";
import type { ActionDefinition } from "@w6w/types";
import { notesParam, paymentLinkIdParam } from "../lib/params.ts";

/**
 * `PATCH /v1/payment_links/{id}` — update an existing link.
 *
 * Only allowed while the link is `created` or `partially_paid`.
 */
interface Input {
  id: string;
  referenceId?: string;
  expireBy?: number;
  reminderEnable?: boolean;
  acceptPartial?: boolean;
  notes?: unknown;
}

const paymentLinkUpdate: ActionDefinition<Input> = {
  key: "payment-link-update",
  type: "perform",
  resource: "payment-link",
  title: "Update Payment Link",
  description:
    "Update a payment link. Only allowed while the link is in 'created' or 'partially_paid' status.",
  idempotent: true,
  params: [
    paymentLinkIdParam(),
    { key: "referenceId", label: "Reference ID", type: "string", hint: "Max 40 characters." },
    {
      key: "expireBy",
      label: "New expiry (Unix timestamp)",
      type: "number",
      validation: { integer: true },
    },
    { key: "reminderEnable", label: "Send automatic payment reminders", type: "boolean" },
    { key: "acceptPartial", label: "Accept partial payments", type: "boolean" },
    notesParam,
  ],
  output: [
    { key: "id", type: "string", label: "Payment Link ID" },
    { key: "status", type: "string", label: "Current status" },
  ],

  async execute(input, ctx) {
    return await new RazorpayClient(ctx).patch(
      `/payment_links/${encodeURIComponent(input.id)}`,
      compact({
        reference_id: input.referenceId,
        expire_by: input.expireBy,
        reminder_enable: input.reminderEnable,
        accept_partial: input.acceptPartial,
        notes: input.notes,
      }),
    );
  },
};

export default paymentLinkUpdate;
