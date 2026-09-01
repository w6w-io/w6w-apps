import type { ActionDefinition } from "@w6w/types";
import { compact, MollieClient } from "../lib/client.ts";
import { paymentIdParam, testmodeParam } from "../lib/params.ts";

/** `DELETE /v2/payments/{id}` — cancel a payment that has not completed yet. */
interface Input {
  paymentId: string;
  testmode?: boolean;
}

const paymentCancel: ActionDefinition<Input> = {
  key: "payment-cancel",
  type: "perform",
  resource: "payment",
  title: "Cancel Payment",
  description:
    "Cancel a payment while it is still cancelable (open, pending or authorized, depending on " +
    "the method).",
  idempotent: true,
  params: [paymentIdParam(), testmodeParam],
  output: [
    { key: "id", type: "string", label: "Payment ID" },
    { key: "status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    return await new MollieClient(ctx).delete(
      `/payments/${encodeURIComponent(input.paymentId)}`,
      compact({ testmode: input.testmode }),
    );
  },
};

export default paymentCancel;
