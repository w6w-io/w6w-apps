import type { ActionDefinition } from "@w6w/types";
import { compact, MollieClient } from "../lib/client.ts";
import { chargebackIdParam, paymentIdParam, testmodeParam } from "../lib/params.ts";

interface Input {
  paymentId: string;
  chargebackId: string;
  testmode?: boolean;
}

const paymentChargebackGet: ActionDefinition<Input> = {
  key: "payment-chargeback-get",
  type: "read",
  resource: "chargeback",
  title: "Get Payment Chargeback",
  description: "Retrieve a single chargeback for a payment.",
  params: [paymentIdParam(), chargebackIdParam(), testmodeParam],
  output: [
    { key: "id", type: "string", label: "Chargeback ID" },
    { key: "amount", type: "object", label: "Amount" },
    { key: "reason", type: "object", label: "Reason" },
  ],

  async execute(input, ctx) {
    return await new MollieClient(ctx).get(
      `/payments/${encodeURIComponent(input.paymentId)}/chargebacks/${
        encodeURIComponent(input.chargebackId)
      }`,
      compact({ testmode: input.testmode }),
    );
  },
};

export default paymentChargebackGet;
