import type { ActionDefinition } from "@w6w/types";
import { PatreonClient } from "../lib/client.ts";

interface Input {
  campaignId: string;
  uri: string;
  /** CSV of trigger names, e.g. "members:create,members:update,members:delete". */
  triggers: string;
}

const VALID_TRIGGERS = new Set([
  "members:create",
  "members:update",
  "members:delete",
  "members:pledge:create",
  "members:pledge:update",
  "members:pledge:delete",
  "posts:publish",
  "posts:update",
  "posts:delete",
]);

const createWebhook: ActionDefinition<Input> = {
  key: "create-webhook",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook",
  description:
    "Create a webhook on a campaign (POST /webhooks). Requires the `w:campaigns.webhook` " +
    "scope. Patreon returns a `secret` in the response used to HMAC-sign (MD5) delivered " +
    "payloads via the `X-Patreon-Signature` header — store it to verify deliveries.",
  idempotent: false,
  params: [
    { key: "campaignId", label: "Campaign ID", type: "string", required: true },
    { key: "uri", label: "Webhook URL", type: "string", required: true },
    {
      key: "triggers",
      label: "Triggers",
      type: "string",
      required: true,
      hint: "CSV from: members:create, members:update, members:delete, members:pledge:create, " +
        "members:pledge:update, members:pledge:delete, posts:publish, posts:update, posts:delete",
    },
  ],
  output: [
    { key: "data.id", type: "string", label: "Webhook ID" },
    { key: "data.attributes.secret", type: "string", label: "HMAC secret" },
  ],

  execute(input, ctx) {
    const triggers = input.triggers.split(",").map((t) => t.trim()).filter(Boolean);
    for (const t of triggers) {
      if (!VALID_TRIGGERS.has(t)) throw new Error(`unknown Patreon webhook trigger: ${t}`);
    }
    return new PatreonClient(ctx).request("/webhooks", {
      method: "POST",
      body: {
        type: "webhook",
        attributes: { triggers, uri: input.uri },
        relationships: {
          campaign: { data: { type: "campaign", id: input.campaignId } },
        },
      },
    });
  },
};

export default createWebhook;
