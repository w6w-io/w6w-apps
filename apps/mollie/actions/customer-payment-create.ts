import type { ActionDefinition } from "@w6w/types";
import { compact, MollieClient } from "../lib/client.ts";
import { amountFrom, amountParams, customerIdParam, testmodeParam } from "../lib/params.ts";

/**
 * `POST /v2/customers/{id}/payments` — create a payment already linked to a
 * customer (equivalent to `payment-create` with `customerId` set, kept as
 * its own action for the "start from a customer" workflow shape).
 */
interface Input {
  customerId: string;
  description: string;
  amountValue: string;
  amountCurrency: string;
  redirectUrl?: string;
  webhookUrl?: string;
  sequenceType?: "oneoff" | "first" | "recurring";
  mandateId?: string;
  testmode?: boolean;
}

const customerPaymentCreate: ActionDefinition<Input> = {
  key: "customer-payment-create",
  type: "perform",
  resource: "customer",
  title: "Create Customer Payment",
  description: "Create a payment already linked to this customer.",
  idempotent: false,
  params: [
    customerIdParam(),
    { key: "description", label: "Description", type: "string", required: true },
    ...amountParams("amount", "Amount", true),
    {
      key: "redirectUrl",
      label: "Redirect URL",
      type: "string",
      hint: "Required unless sequenceType is recurring.",
    },
    { key: "webhookUrl", label: "Webhook URL", type: "string", advanced: true },
    {
      key: "sequenceType",
      label: "Sequence type",
      type: "select",
      advanced: true,
      options: [
        { label: "One-off (default)", value: "oneoff" },
        { label: "First (establishes a mandate)", value: "first" },
        { label: "Recurring (charges an existing mandate)", value: "recurring" },
      ],
    },
    { key: "mandateId", label: "Mandate ID", type: "string", advanced: true, placeholder: "mdt_…" },
    testmodeParam,
  ],
  output: [
    { key: "id", type: "string", label: "Payment ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "_links", type: "object", label: "Links (checkout.href)" },
  ],

  async execute(input, ctx) {
    return await new MollieClient(ctx).post(
      `/customers/${encodeURIComponent(input.customerId)}/payments`,
      compact({
        description: input.description,
        amount: amountFrom(input, "amount"),
        redirectUrl: input.redirectUrl,
        webhookUrl: input.webhookUrl,
        sequenceType: input.sequenceType,
        mandateId: input.mandateId,
        testmode: input.testmode,
      }),
    );
  },
};

export default customerPaymentCreate;
