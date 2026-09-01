import type { ActionDefinition } from "@w6w/types";
import { compact, MollieClient } from "../lib/client.ts";
import {
  amountFrom,
  amountParams,
  asOptionalJson,
  customerIdParam,
  metadataParam,
  subscriptionIdParam,
  testmodeParam,
} from "../lib/params.ts";

interface Input {
  customerId: string;
  subscriptionId: string;
  amountValue?: string;
  amountCurrency?: string;
  description?: string;
  interval?: string;
  startDate?: string;
  times?: number;
  webhookUrl?: string;
  mandateId?: string;
  metadata?: unknown;
  testmode?: boolean;
}

const subscriptionUpdate: ActionDefinition<Input> = {
  key: "subscription-update",
  type: "perform",
  resource: "subscription",
  title: "Update Subscription",
  description: "Update a subscription's amount, description, interval, schedule or mandate.",
  idempotent: true,
  params: [
    customerIdParam(),
    subscriptionIdParam(),
    ...amountParams("amount", "Amount per charge", false),
    { key: "description", label: "Description", type: "string" },
    { key: "interval", label: "Interval", type: "string", advanced: true, placeholder: "1 month" },
    { key: "startDate", label: "Start date", type: "date", advanced: true },
    {
      key: "times",
      label: "Times",
      type: "number",
      advanced: true,
      validation: { integer: true, min: 1 },
    },
    { key: "webhookUrl", label: "Webhook URL", type: "string", advanced: true },
    { key: "mandateId", label: "Mandate ID", type: "string", advanced: true },
    metadataParam,
    testmodeParam,
  ],
  output: [
    { key: "id", type: "string", label: "Subscription ID" },
    { key: "status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    return await new MollieClient(ctx).patch(
      `/customers/${encodeURIComponent(input.customerId)}/subscriptions/${
        encodeURIComponent(input.subscriptionId)
      }`,
      compact({
        amount: amountFrom(input, "amount"),
        description: input.description,
        interval: input.interval,
        startDate: input.startDate,
        times: input.times,
        webhookUrl: input.webhookUrl,
        mandateId: input.mandateId,
        metadata: asOptionalJson(input.metadata, "metadata"),
        testmode: input.testmode,
      }),
    );
  },
};

export default subscriptionUpdate;
