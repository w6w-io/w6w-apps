import type { ActionDefinition } from "@w6w/types";
import { compact, MollieClient } from "../lib/client.ts";
import { paymentIdParam, refundIdParam, testmodeParam } from "../lib/params.ts";

interface Input {
  paymentId: string;
  refundId: string;
  testmode?: boolean;
}

const paymentRefundGet: ActionDefinition<Input> = {
  key: "payment-refund-get",
  type: "read",
  resource: "refund",
  title: "Get Payment Refund",
  description: "Retrieve a single refund for a payment.",
  params: [paymentIdParam(), refundIdParam(), testmodeParam],
  output: [
    { key: "id", type: "string", label: "Refund ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "amount", type: "object", label: "Amount" },
  ],

  async execute(input, ctx) {
    return await new MollieClient(ctx).get(
      `/payments/${encodeURIComponent(input.paymentId)}/refunds/${
        encodeURIComponent(input.refundId)
      }`,
      compact({ testmode: input.testmode }),
    );
  },
};

export default paymentRefundGet;
