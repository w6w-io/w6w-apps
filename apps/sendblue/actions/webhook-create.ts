import type { ActionDefinition } from "@w6w/types";
import { compact, SendblueClient } from "../lib/client.ts";

interface Input {
  url: string;
  type?: string;
  globalSecret?: string;
  sendblueNumbers?: string[] | string;
}

/**
 * `POST /api/account/webhooks` — APPENDS to existing webhooks for the given
 * type; it does not replace them (`webhook-update` does that, via `PUT`).
 */
const webhookCreate: ActionDefinition<Input> = {
  key: "webhook-create",
  type: "perform",
  resource: "webhook",
  title: "Add Webhook",
  description: "Add a webhook URL. Appended to any existing webhooks of the same type.",
  idempotent: false,
  params: [
    { key: "url", label: "Webhook URL", type: "string", required: true },
    {
      key: "type",
      label: "Event type",
      type: "select",
      options: [
        "receive",
        "line_blocked",
        "line_assigned",
        "outbound",
        "typing_indicator",
        "call_log",
        "contact_created",
      ].map((v) => ({ value: v, label: v })),
      hint: "Defaults to Sendblue's own default (receive) when left unset.",
    },
    {
      key: "globalSecret",
      label: "Global signature secret",
      type: "secret",
      advanced: true,
      hint: "Applied to every webhook that has no per-webhook secret of its own.",
    },
    {
      key: "sendblueNumbers",
      label: "Restrict to Sendblue numbers",
      type: "multiselect",
      advanced: true,
      hint: "Receive webhooks only. When set, only inbound messages to these lines are " +
        "delivered here.",
    },
  ],
  output: [{ key: "webhooks", type: "object", label: "Webhooks by event type" }],

  execute(input, ctx) {
    const client = new SendblueClient(ctx);
    const numbers = Array.isArray(input.sendblueNumbers)
      ? input.sendblueNumbers
      : input.sendblueNumbers
      ? [input.sendblueNumbers]
      : undefined;
    const webhookEntry = numbers?.length
      ? { url: input.url, sendblue_numbers: numbers }
      : input.url;
    return client.post(
      "/api/account/webhooks",
      compact({
        webhooks: [webhookEntry],
        type: input.type,
        globalSecret: input.globalSecret,
      }),
    );
  },
};

export default webhookCreate;
