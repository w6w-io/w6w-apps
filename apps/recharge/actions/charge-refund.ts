import type { ActionDefinition } from "@w6w/types";
import { compact, RechargeClient } from "../lib/client.ts";
import { chargeIdParam } from "../lib/params.ts";

interface Input {
  chargeId: string;
  amount: string;
  fullRefund?: boolean;
  retry?: boolean;
  error?: string;
  errorType?: string;
}

/**
 * `POST /charges/{id}/refund` — refund a charge, fully or partially. Scopes:
 * `write_orders` and `write_payment_methods`.
 *
 * Per the reference: the charge's `status` becomes `refunded` or
 * `partially_refunded` depending on `amount`. If `retry` is `true`, `error`
 * and `error_type` become required and the charge's `status` becomes
 * `error` instead — used when the order submission attempt on the remote
 * platform failed after the payment transaction itself succeeded, so a new
 * attempt is queued through the normal dunning process.
 *
 * Response envelope: `{"charge": {...}}`.
 */
const chargeRefund: ActionDefinition<Input> = {
  key: "charge-refund",
  type: "perform",
  resource: "charge",
  title: "Refund Charge",
  description: "Refund a charge, fully or partially.",
  idempotent: false,
  params: [
    chargeIdParam,
    { key: "amount", label: "Amount", type: "string", required: true },
    {
      key: "fullRefund",
      label: "Full refund",
      type: "boolean",
      hint: "If true, the charge is refunded in full.",
    },
    {
      key: "retry",
      label: "Retry after refund",
      type: "boolean",
      hint: "Requires Full refund and both Error / Error type below. Charge status becomes " +
        "'error' so it re-enters the dunning process.",
    },
    {
      key: "error",
      label: "Error",
      type: "string",
      hint: "Required when Retry is true. Documented valid value: insufficient_inventory.",
    },
    { key: "errorType", label: "Error type", type: "string", hint: "Required when Retry is true." },
  ],
  output: [
    { key: "id", type: "number", label: "Charge ID" },
    { key: "status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    const client = new RechargeClient(ctx);
    return await client.single(
      `/charges/${encodeURIComponent(input.chargeId)}/refund`,
      "charge",
      {
        method: "POST",
        body: compact({
          amount: input.amount,
          full_refund: input.fullRefund,
          retry: input.retry,
          error: input.error,
          error_type: input.errorType,
        }),
      },
    );
  },
};

export default chargeRefund;
