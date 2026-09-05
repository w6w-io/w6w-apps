import type { ActionDefinition } from "@w6w/types";
import { InvoiceNinjaClient } from "../lib/client.ts";
import { paymentOutput } from "../lib/params.ts";

interface Input {
  paymentId: string;
}

/** `GET /api/v1/payments/{id}` — verified against `showPayment`. */
const paymentGet: ActionDefinition<Input> = {
  key: "payment-get",
  type: "read",
  resource: "payment",
  title: "Get Payment",
  description: "Retrieve a single payment by hashed ID.",
  params: [
    { key: "paymentId", label: "Payment ID", type: "string", required: true },
  ],
  output: paymentOutput,

  execute(input, ctx) {
    return new InvoiceNinjaClient(ctx).request(`/payments/${input.paymentId}`);
  },
};

export default paymentGet;
