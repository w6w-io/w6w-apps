import type { ActionDefinition } from "@w6w/types";
import { compact, MollieClient } from "../lib/client.ts";
import {
  amountFrom,
  amountParams,
  asOptionalJson,
  metadataParam,
  profileIdParam,
  testmodeParam,
} from "../lib/params.ts";

/**
 * `POST /v2/payments` — create a payment.
 *
 * `redirectUrl` is documented as required, with one stated exception:
 * "can be omitted for recurring payments (`sequenceType: recurring`) and
 * for Apple Pay payments with an `applePayPaymentToken`" — this app declares
 * it optional so a recurring-payment workflow is not forced to fabricate a
 * URL nobody will visit, and lets Mollie's own validation enforce the rule
 * for a one-off payment that truly needs it.
 */
interface Input {
  description: string;
  amountValue: string;
  amountCurrency: string;
  redirectUrl?: string;
  cancelUrl?: string;
  webhookUrl?: string;
  method?: string;
  locale?: string;
  sequenceType?: "oneoff" | "first" | "recurring";
  customerId?: string;
  mandateId?: string;
  dueDate?: string;
  metadata?: unknown;
  profileId?: string;
  testmode?: boolean;
}

const paymentCreate: ActionDefinition<Input> = {
  key: "payment-create",
  type: "perform",
  resource: "payment",
  title: "Create Payment",
  description: "Create a payment. Returns a `_links.checkout.href` the customer completes it at.",
  idempotent: false,
  params: [
    {
      key: "description",
      label: "Description",
      type: "string",
      required: true,
      hint: "Max 255 characters — shown on the customer's card/bank statement.",
    },
    ...amountParams("amount", "Amount", true),
    {
      key: "redirectUrl",
      label: "Redirect URL",
      type: "string",
      hint:
        "Where the customer returns after paying. Required unless sequenceType is recurring or this is an Apple Pay token payment.",
    },
    { key: "cancelUrl", label: "Cancel URL", type: "string", advanced: true },
    {
      key: "webhookUrl",
      label: "Webhook URL",
      type: "string",
      advanced: true,
      hint: "Must be reachable from Mollie — not localhost.",
    },
    {
      key: "method",
      label: "Method",
      type: "string",
      advanced: true,
      placeholder: "ideal",
      hint: "Restrict to one payment method id (see method-list). Omit to show the method picker.",
    },
    { key: "locale", label: "Locale", type: "string", advanced: true, placeholder: "nl_NL" },
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
    {
      key: "customerId",
      label: "Customer ID",
      type: "string",
      advanced: true,
      placeholder: "cst_…",
      hint: "Required if sequenceType is recurring.",
    },
    { key: "mandateId", label: "Mandate ID", type: "string", advanced: true, placeholder: "mdt_…" },
    {
      key: "dueDate",
      label: "Due date",
      type: "date",
      advanced: true,
      hint: "YYYY-MM-DD. Only some methods (e.g. bank transfer) use this.",
    },
    metadataParam,
    profileIdParam,
    testmodeParam,
  ],
  output: [
    { key: "id", type: "string", label: "Payment ID (tr_*)" },
    { key: "status", type: "string", label: "Status" },
    { key: "amount", type: "object", label: "Amount" },
    { key: "_links", type: "object", label: "Links (checkout.href, dashboard.href, …)" },
  ],

  async execute(input, ctx) {
    return await new MollieClient(ctx).post(
      "/payments",
      compact({
        description: input.description,
        amount: amountFrom(input, "amount"),
        redirectUrl: input.redirectUrl,
        cancelUrl: input.cancelUrl,
        webhookUrl: input.webhookUrl,
        method: input.method,
        locale: input.locale,
        sequenceType: input.sequenceType,
        customerId: input.customerId,
        mandateId: input.mandateId,
        dueDate: input.dueDate,
        metadata: asOptionalJson(input.metadata, "metadata"),
        profileId: input.profileId,
        testmode: input.testmode,
      }),
    );
  },
};

export default paymentCreate;
