import type { ActionDefinition } from "@w6w/types";
import { JustCallClient } from "../lib/client.ts";

/**
 * `DELETE /v2.1/webhooks/url/{url_id}` — verified against
 * `webhook_delete_url_v21`'s OpenAPI fragment, 2026-09-05.
 *
 * `url_id` is the id JustCall assigns to one subscribed URL (returned in
 * `webhook_urls[].url_id` by `webhook-list`/`webhook-create`) — it is a
 * **string** in the vendor's own schema, unlike the numeric ids used
 * elsewhere in this app.
 */
interface Input {
  url_id: string;
}

const webhookDeleteUrl: ActionDefinition<Input> = {
  key: "webhook-delete-url",
  type: "perform",
  resource: "webhook",
  title: "Remove Webhook URL",
  description: "Unsubscribe one URL from a webhook event, by its url_id.",
  // The end state (URL not subscribed) is the same however many times this runs.
  idempotent: true,
  params: [
    { key: "url_id", label: "URL ID", type: "string", required: true },
  ],
  output: [
    { key: "type", type: "string", label: "Event type" },
    { key: "webhook_urls", type: "array", label: "URLs still subscribed to this event" },
    { key: "url_count", type: "number", label: "Total URLs remaining" },
  ],

  async execute(input, ctx) {
    const client = new JustCallClient(ctx);
    return await client.data(`/webhooks/url/${encodeURIComponent(input.url_id)}`, {
      method: "DELETE",
    });
  },
};

export default webhookDeleteUrl;
