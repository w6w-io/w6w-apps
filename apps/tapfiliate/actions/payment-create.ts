import type { ActionDefinition } from "@w6w/types";
import { TapfiliateClient } from "../lib/client.ts";

/**
 * `POST /payments/`
 *
 * The docs note this can create a single payment OR multiple at once, by
 * posting an array of payment objects instead of one object. This action
 * exposes only the single-payment form; `payments` (an array of
 * `{affiliate_id, amount, currency}`) is left out of a v1 build for surface
 * control — see the README.
 */
interface Input {
  affiliateId: string;
  amount: number;
  currency: string;
}

const paymentCreate: ActionDefinition<Input> = {
  key: "payment-create",
  type: "perform",
  resource: "payment",
  title: "Create Payment",
  description: "Record a single payment to an affiliate, deducting it from their balance.",
  idempotent: false,
  params: [
    { key: "affiliateId", label: "Affiliate", type: "string", required: true },
    { key: "amount", label: "Amount", type: "number", required: true },
    {
      key: "currency",
      label: "Currency",
      type: "string",
      required: true,
      hint: "Three-letter ISO code.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "New payment id" },
    { key: "amount", type: "number", label: "Amount" },
    { key: "currency", type: "string", label: "Currency" },
  ],

  async execute(input, ctx) {
    return await new TapfiliateClient(ctx).json("/payments/", {
      method: "POST",
      body: { affiliate_id: input.affiliateId, amount: input.amount, currency: input.currency },
    });
  },
};

export default paymentCreate;
