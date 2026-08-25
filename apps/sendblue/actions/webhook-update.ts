import type { ActionDefinition } from "@w6w/types";
import { SendblueClient } from "../lib/client.ts";
import { asJson } from "../lib/params.ts";

interface Input {
  webhooks: unknown;
}

/**
 * `PUT /api/account/webhooks` — REPLACES all webhooks for the account (unlike
 * `webhook-create`, which appends). Takes the full by-type object, not a
 * single URL, so this is deliberately a raw-JSON action: getting one key
 * wrong here silently drops every webhook of that type.
 */
const webhookUpdate: ActionDefinition<Input> = {
  key: "webhook-update",
  type: "perform",
  resource: "webhook",
  title: "Replace Webhooks",
  description: "Replace ALL webhooks for the account. This overwrites the existing " +
    "configuration — read webhook-list first if you only want to add or remove one entry.",
  idempotent: true,
  params: [
    {
      key: "webhooks",
      label: "Webhooks (JSON, full replacement)",
      type: "json",
      required: true,
      hint: '{"receive": ["https://..."], "outbound": ["https://..."], "globalSecret": "..."}',
    },
  ],
  output: [{ key: "webhooks", type: "object", label: "Webhooks by event type" }],

  execute(input, ctx) {
    const client = new SendblueClient(ctx);
    return client.put("/api/account/webhooks", {
      webhooks: asJson<Record<string, unknown>>(input.webhooks, "webhooks"),
    });
  },
};

export default webhookUpdate;
