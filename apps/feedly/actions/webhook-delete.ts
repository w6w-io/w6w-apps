import type { ActionDefinition } from "@w6w/types";
import { FeedlyClient, webhookPath } from "../lib/client.ts";

/**
 * `DELETE /v3/enterprise/triggers/{triggerId}` — delete a webhook.
 *
 * Verified against the "Delete a Webhook" reference page (fetched
 * 2026-09-06): `servers: ["https://api.feedly.com/v3/enterprise"]`. That
 * page's OpenAPI document literally spells the path
 * `/triggers/:{triggerid}` — a stray `:` before the `{param}` brace that is
 * not valid OpenAPI templating and looks like a leaked Express route
 * (`router.delete('/triggers/:triggerid', ...)`). Every sibling delete in
 * this API (`delete-article-from-board`: `/{streamId}/{entryId}`, no colon)
 * uses the ordinary form, so {@link webhookPath} builds
 * `/enterprise/triggers/{triggerId}` — see `lib/client.ts` for the full
 * writeup and the live probe that could not disambiguate the two spellings.
 *
 * Marked idempotent: deleting an already-deleted webhook id reaches the same
 * end state as deleting it once.
 */

interface Input {
  triggerId: string;
}

const webhookDelete: ActionDefinition<Input> = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhooks",
  title: "Delete Webhook",
  description: "Delete a configured webhook by id.",
  idempotent: true,
  params: [
    { key: "triggerId", label: "Webhook (trigger) ID", type: "string", required: true },
  ],
  output: [],

  async execute(input, ctx) {
    await new FeedlyClient(ctx).status(webhookPath(input.triggerId), { method: "DELETE" });
    return {};
  },
};

export default webhookDelete;
