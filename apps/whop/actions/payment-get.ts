import type { ActionDefinition } from "@w6w/types";
import { stripPaymentSecret, WhopClient } from "../lib/client.ts";
import { paymentIdParam } from "../lib/params.ts";

/**
 * `GET /payments/{id}` — the Legacy Payments resource. See `lib/client.ts`
 * for why this app does not treat Payments as migrated to `account_id`, and
 * for why `client_secret` is stripped before this returns.
 */
interface Input {
  paymentId: string;
}

const paymentGet: ActionDefinition<Input> = {
  key: "payment-get",
  type: "read",
  resource: "payment",
  title: "Get Payment",
  description: "Retrieve the details of an existing payment.",
  params: [paymentIdParam],
  output: [{ key: "data", type: "object", label: "The payment" }],

  async execute(input, ctx) {
    const payment = await new WhopClient(ctx).get(
      `/payments/${encodeURIComponent(input.paymentId)}`,
    );
    return stripPaymentSecret(payment);
  },
};

export default paymentGet;
