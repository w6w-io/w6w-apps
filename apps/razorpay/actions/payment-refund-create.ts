import type { ActionDefinition } from "@w6w/types";
import { compact, RazorpayClient } from "../lib/client.ts";
import { amountParam, notesParam, paymentIdParam } from "../lib/params.ts";

/**
 * `POST /v1/payments/{id}/refund` — initiate a full or partial refund for a
 * captured payment.
 *
 * ## A retried refund is a second real refund unless idempotency is used
 *
 * The vendor documents `X-Refund-Idempotency` (>= 10 chars) as the only
 * thing protecting a retry: "multiple calls to create a refund with the
 * same idempotency key will only create the refund with the first call and
 * return the existing refund on subsequent calls". A different payload under
 * the same key is rejected outright; a `409` means a prior request with that
 * key is still processing and must be retried later, not resent immediately.
 * This action always sends `ctx.invocation.invocationId` as that key when
 * one is available, so the runtime's own retry of a dropped connection
 * cannot double-refund a payment.
 */
interface Input {
  id: string;
  amount?: number;
  speed?: "normal" | "optimum";
  receipt?: string;
  notes?: unknown;
}

const paymentRefundCreate: ActionDefinition<Input> = {
  key: "payment-refund-create",
  type: "perform",
  resource: "refund",
  title: "Refund Payment",
  description:
    "Refund a captured payment, in full or in part. Speed 'optimum' is instant when available " +
    "and falls back to normal (5-7 business days) otherwise.",
  idempotent: false,
  params: [
    paymentIdParam("Payment ID to refund (pay_*). Must be captured."),
    amountParam("Amount", false),
    {
      key: "speed",
      label: "Speed",
      type: "select",
      default: "normal",
      options: [
        { value: "normal", label: "Normal — 5-7 business days" },
        { value: "optimum", label: "Optimum — instant if available, else normal" },
      ],
    },
    {
      key: "receipt",
      label: "Receipt",
      type: "string",
      hint: "Your internal reference identifier.",
    },
    notesParam,
  ],
  output: [
    { key: "id", type: "string", label: "Refund ID (rfnd_*)" },
    { key: "amount", type: "number", label: "Refund amount (sub-unit)" },
    { key: "payment_id", type: "string", label: "Original payment ID" },
    { key: "status", type: "string", label: "pending | processed | failed" },
    { key: "speed_requested", type: "string", label: "normal | optimum" },
    { key: "speed_processed", type: "string", label: "Actual processing mode used" },
  ],

  async execute(input, ctx) {
    const headers: Record<string, string> = {};
    if (ctx.invocation?.invocationId) {
      headers["X-Refund-Idempotency"] = ctx.invocation.invocationId;
    }
    return await new RazorpayClient(ctx).post(
      `/payments/${encodeURIComponent(input.id)}/refund`,
      compact({
        amount: input.amount,
        speed: input.speed,
        receipt: input.receipt,
        notes: input.notes,
      }),
      headers,
    );
  },
};

export default paymentRefundCreate;
