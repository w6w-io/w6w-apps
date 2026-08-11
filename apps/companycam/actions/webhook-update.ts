import type { ActionDefinition } from "@w6w/types";
import { compact, CompanyCamClient, encodeId, stripWebhookSecret, toList } from "../lib/client.ts";
import { webhookScopeOptions } from "../lib/webhook-scopes.ts";

/**
 * `PUT /v2/webhooks/{id}` — change a subscription's URL, scopes, token or
 * enabled flag.
 *
 * The documented success status is `201`. **Scopes are replaced, not merged** —
 * a `PUT` states the whole value, so sending one scope leaves a webhook
 * subscribed to exactly that one.
 *
 * The most useful thing here is `enabled: true`: a webhook CompanyCam disabled
 * after 25 delivery failures comes back this way, and no other endpoint
 * re-enables it.
 *
 * Idempotent: the fields named are set to the values given.
 */
interface Input {
  webhookId: string;
  url?: string;
  scopes?: string[] | string;
  token?: string;
  enabled?: boolean;
}

const webhookUpdate: ActionDefinition<Input> = {
  key: "webhook-update",
  type: "perform",
  resource: "webhook",
  title: "Update Webhook",
  description:
    "Change a webhook's URL, scopes, signing token or enabled flag. Scopes are replaced, not " +
    "merged.",
  idempotent: true,
  params: [
    { key: "webhookId", label: "Webhook ID", type: "string", required: true },
    { key: "url", label: "Target URL", type: "string" },
    {
      key: "scopes",
      label: "Event scopes",
      type: "multiselect",
      options: webhookScopeOptions,
      hint: "REPLACES the subscription's scopes with exactly these.",
    },
    {
      key: "token",
      label: "Signing token",
      type: "secret",
      hint: "Rotating this invalidates the signature every existing receiver checks against.",
    },
    {
      key: "enabled",
      label: "Enabled",
      type: "boolean",
      hint: "Set true to revive a webhook CompanyCam disabled after 25 delivery failures.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Webhook ID" },
    { key: "url", type: "string", label: "Target URL" },
    { key: "scopes", type: "array", label: "Event scopes" },
    { key: "enabled", type: "boolean", label: "Enabled" },
  ],

  execute(input, ctx) {
    const body = compact({
      url: input.url,
      scopes: toList(input.scopes),
      token: input.token,
      enabled: input.enabled,
    });
    if (Object.keys(body).length === 0) {
      throw new Error("Nothing to update — set a URL, scopes, a token or the enabled flag");
    }

    return new CompanyCamClient(ctx)
      .json(`/webhooks/${encodeId(input.webhookId)}`, { method: "PUT", body })
      .then(stripWebhookSecret);
  },
};

export default webhookUpdate;
