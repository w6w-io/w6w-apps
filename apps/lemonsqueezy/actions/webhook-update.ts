import type { ActionDefinition } from "@w6w/types";
import { jsonApiBody, LemonSqueezyClient } from "../lib/client.ts";
import { webhookEventOptions } from "../lib/params.ts";

/** `PATCH /v1/webhooks/:id`. `secret` is write-only — see `webhook-create`. */
interface Input {
  webhookId: string;
  url?: string;
  events?: string[] | string;
  secret?: string;
}

const webhookUpdate: ActionDefinition<Input> = {
  key: "webhook-update",
  type: "perform",
  resource: "webhook",
  title: "Update Webhook",
  description: "Update a webhook's URL, events or signing secret.",
  idempotent: true,
  params: [
    { key: "webhookId", label: "Webhook ID", type: "string", required: true },
    { key: "url", label: "URL", type: "string" },
    { key: "events", label: "Events", type: "multiselect", options: webhookEventOptions },
    {
      key: "secret",
      label: "Signing secret",
      type: "secret",
      hint: "Never returned by the API — keep your own copy.",
    },
  ],
  output: [{ key: "data", type: "object", label: "The updated Webhook object" }],

  execute(input, ctx) {
    const events = input.events === undefined
      ? undefined
      : Array.isArray(input.events)
      ? input.events
      : String(input.events).split(",").map((s) => s.trim()).filter(Boolean);

    return new LemonSqueezyClient(ctx).request(
      `/webhooks/${encodeURIComponent(input.webhookId)}`,
      {
        method: "PATCH",
        body: jsonApiBody(
          "webhooks",
          { url: input.url, events, secret: input.secret },
          undefined,
          input.webhookId,
        ),
      },
    );
  },
};

export default webhookUpdate;
