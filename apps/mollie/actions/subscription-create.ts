import type { ActionDefinition } from "@w6w/types";
import { compact, MollieClient } from "../lib/client.ts";
import {
  amountFrom,
  amountParams,
  asOptionalJson,
  customerIdParam,
  metadataParam,
  testmodeParam,
} from "../lib/params.ts";

/**
 * `POST /v2/customers/{id}/subscriptions` — start a recurring subscription
 * against a customer with a valid mandate. `amount`, `interval` and
 * `description` are required.
 */
interface Input {
  customerId: string;
  amountValue: string;
  amountCurrency: string;
  interval: string;
  description: string;
  times?: number;
  startDate?: string;
  method?: string;
  mandateId?: string;
  webhookUrl?: string;
  metadata?: unknown;
  testmode?: boolean;
}

const subscriptionCreate: ActionDefinition<Input> = {
  key: "subscription-create",
  type: "perform",
  resource: "subscription",
  title: "Create Subscription",
  description:
    "Start a recurring subscription against a customer that already has a valid mandate (e.g. " +
    "from a prior `first` payment).",
  idempotent: false,
  params: [
    customerIdParam(),
    ...amountParams("amount", "Amount per charge", true),
    {
      key: "interval",
      label: "Interval",
      type: "string",
      required: true,
      placeholder: "1 month",
      hint: 'e.g. "1 month", "14 days", "1 day". Maximum interval is 1 year.',
    },
    {
      key: "description",
      label: "Description",
      type: "string",
      required: true,
      hint: "Used as the description of each resulting individual payment.",
    },
    {
      key: "times",
      label: "Times",
      type: "number",
      advanced: true,
      validation: { integer: true, min: 1 },
      hint: "Total number of charges. Omit for an ongoing subscription with no end.",
    },
    {
      key: "startDate",
      label: "Start date",
      type: "date",
      advanced: true,
      hint: "YYYY-MM-DD. Defaults to now.",
    },
    {
      key: "method",
      label: "Method",
      type: "string",
      advanced: true,
      hint: "Restrict to one method. Omit to use any of the customer's valid mandates.",
    },
    { key: "mandateId", label: "Mandate ID", type: "string", advanced: true, placeholder: "mdt_…" },
    { key: "webhookUrl", label: "Webhook URL", type: "string", advanced: true },
    metadataParam,
    testmodeParam,
  ],
  output: [
    { key: "id", type: "string", label: "Subscription ID (sub_*)" },
    { key: "status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    return await new MollieClient(ctx).post(
      `/customers/${encodeURIComponent(input.customerId)}/subscriptions`,
      compact({
        amount: amountFrom(input, "amount"),
        interval: input.interval,
        description: input.description,
        times: input.times,
        startDate: input.startDate,
        method: input.method,
        mandateId: input.mandateId,
        webhookUrl: input.webhookUrl,
        metadata: asOptionalJson(input.metadata, "metadata"),
        testmode: input.testmode,
      }),
    );
  },
};

export default subscriptionCreate;
