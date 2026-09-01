import type { ActionDefinition } from "@w6w/types";
import { RazorpayClient } from "../lib/client.ts";
import { amountParam, currencyParam, paymentIdParam } from "../lib/params.ts";

/**
 * `POST /v1/payments/{id}/capture` — capture an authorized payment to
 * collect funds.
 *
 * Must be called within the capture window (default 5 days), and `amount`
 * must exactly equal the authorized amount unless partial capture is
 * enabled on the account — Razorpay rejects a mismatch rather than
 * capturing a different amount than asked.
 */
interface Input {
  id: string;
  amount: number;
  currency?: string;
}

const paymentCapture: ActionDefinition<Input> = {
  key: "payment-capture",
  type: "perform",
  resource: "payment",
  title: "Capture Payment",
  description:
    "Capture an authorized payment. Amount must exactly equal the authorized amount unless " +
    "partial capture is enabled on the account.",
  idempotent: false,
  params: [
    paymentIdParam("Payment ID (pay_*). Must currently be in 'authorized' status."),
    amountParam("Amount to capture"),
    currencyParam,
  ],
  output: [
    { key: "id", type: "string", label: "Payment ID" },
    { key: "status", type: "string", label: "Now 'captured' on success" },
    { key: "amount", type: "number", label: "Amount (sub-unit)" },
  ],

  async execute(input, ctx) {
    return await new RazorpayClient(ctx).post(`/payments/${encodeURIComponent(input.id)}/capture`, {
      amount: input.amount,
      currency: input.currency ?? "INR",
    });
  },
};

export default paymentCapture;
