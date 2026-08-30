import type { ActionDefinition } from "@w6w/types";
import { idempotencyHeaders, stripPaymentSecret, WhopClient } from "../lib/client.ts";
import { paymentIdParam } from "../lib/params.ts";

/**
 * `POST /payments/{id}/refund` — the Legacy Payments resource. Processed
 * through the original payment processor; the membership status is updated
 * accordingly. Not naturally idempotent (a second call would refund again up
 * to whatever remains), but the vendor's global `Idempotency-Key` header
 * mechanism covers every authenticated POST, so a retry of the same runtime
 * step replays the original refund instead of issuing a second one.
 */
interface Input {
  paymentId: string;
  partialAmount?: number;
}

const paymentRefund: ActionDefinition<Input> = {
  key: "payment-refund",
  type: "perform",
  resource: "payment",
  title: "Refund Payment",
  description: "Issue a full or partial refund for a payment.",
  idempotent: true,
  params: [
    paymentIdParam,
    {
      key: "partialAmount",
      label: "Partial amount",
      type: "number",
      hint: "Amount to refund, in the charge currency. Leave empty to refund the full amount.",
    },
  ],
  output: [{ key: "data", type: "object", label: "The refunded payment" }],

  async execute(input, ctx) {
    const payment = await new WhopClient(ctx).post(
      `/payments/${encodeURIComponent(input.paymentId)}/refund`,
      { partial_amount: input.partialAmount },
      idempotencyHeaders(ctx)["Idempotency-Key"],
    );
    return stripPaymentSecret(payment);
  },
};

export default paymentRefund;
