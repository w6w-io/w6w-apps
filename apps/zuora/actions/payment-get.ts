import type { ActionDefinition } from "@w6w/types";
import { ZuoraClient } from "../lib/client.ts";

interface Input {
  paymentKey: string;
}

/**
 * `GET /object-query/payments/{key}` — verified against
 * `developer.zuora.com/v1-api-reference/api/object-queries/querypaymentbykey`.
 *
 * Uses Object Query rather than the classic `GET /v1/payments/{paymentKey}`,
 * which Zuora documents as "only available if you have Invoice Settlement
 * enabled" — see `payment-list.ts` for why this app avoids that gate
 * everywhere it has a real alternative.
 */
const action: ActionDefinition<Input> = {
  key: "payment-get",
  type: "read",
  resource: "payment",
  title: "Get Payment",
  description: "Retrieve a specific payment.",
  params: [
    { key: "paymentKey", label: "Payment Key", type: "string", required: true },
  ],
  output: [{ key: "payment", type: "object", label: "Payment" }],

  async execute(input, ctx) {
    const client = new ZuoraClient(ctx);
    const payment = await client.request(
      `/object-query/payments/${encodeURIComponent(input.paymentKey)}`,
    );
    return { payment };
  },
};

export default action;
