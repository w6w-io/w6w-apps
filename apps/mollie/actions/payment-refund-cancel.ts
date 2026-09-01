import type { ActionDefinition } from "@w6w/types";
import { compact, MollieClient } from "../lib/client.ts";
import { paymentIdParam, refundIdParam, testmodeParam } from "../lib/params.ts";

/**
 * `DELETE /v2/payments/{id}/refunds/{refundId}` — cancel a refund that has
 * not been processed by the bank/card network yet. Only possible for a
 * handful of methods (e.g. some bank transfers); most refunds process
 * immediately and cannot be cancelled once created.
 */
interface Input {
  paymentId: string;
  refundId: string;
  testmode?: boolean;
}

const paymentRefundCancel: ActionDefinition<Input> = {
  key: "payment-refund-cancel",
  type: "perform",
  resource: "refund",
  title: "Cancel Refund",
  description: "Cancel a refund that has not been processed yet. Only some methods support this.",
  idempotent: true,
  params: [paymentIdParam(), refundIdParam(), testmodeParam],
  output: [
    { key: "refundId", type: "string", label: "Refund ID" },
    { key: "canceled", type: "boolean", label: "Canceled" },
  ],

  async execute(input, ctx) {
    await new MollieClient(ctx).delete(
      `/payments/${encodeURIComponent(input.paymentId)}/refunds/${
        encodeURIComponent(input.refundId)
      }`,
      compact({ testmode: input.testmode }),
    );
    return { refundId: input.refundId, canceled: true };
  },
};

export default paymentRefundCancel;
