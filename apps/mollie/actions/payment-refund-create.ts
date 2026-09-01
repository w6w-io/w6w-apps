import type { ActionDefinition } from "@w6w/types";
import { compact, MollieClient } from "../lib/client.ts";
import {
  amountFrom,
  amountParams,
  asOptionalJson,
  metadataParam,
  paymentIdParam,
  testmodeParam,
} from "../lib/params.ts";

/** `POST /v2/payments/{id}/refunds` — refund a payment, in full or in part. */
interface Input {
  paymentId: string;
  amountValue: string;
  amountCurrency: string;
  description?: string;
  metadata?: unknown;
  testmode?: boolean;
}

const paymentRefundCreate: ActionDefinition<Input> = {
  key: "payment-refund-create",
  type: "perform",
  resource: "refund",
  title: "Create Refund",
  description:
    "Refund a payment, in full or in part. `amount` is required — there is no implicit full refund.",
  idempotent: false,
  params: [
    paymentIdParam(),
    ...amountParams("amount", "Amount", true),
    {
      key: "description",
      label: "Description",
      type: "string",
      advanced: true,
      hint: "Shown to the customer where the payment method supports it.",
    },
    metadataParam,
    testmodeParam,
  ],
  output: [
    { key: "id", type: "string", label: "Refund ID (re_*)" },
    { key: "status", type: "string", label: "Status" },
    { key: "amount", type: "object", label: "Amount" },
  ],

  async execute(input, ctx) {
    return await new MollieClient(ctx).post(
      `/payments/${encodeURIComponent(input.paymentId)}/refunds`,
      compact({
        amount: amountFrom(input, "amount"),
        description: input.description,
        metadata: asOptionalJson(input.metadata, "metadata"),
        testmode: input.testmode,
      }),
    );
  },
};

export default paymentRefundCreate;
