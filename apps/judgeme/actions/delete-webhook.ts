import type { ActionDefinition } from "@w6w/types";
import { JudgeMeClient } from "../lib/client.ts";

/**
 * `DELETE /webhooks` — Delete.
 *
 * Deletes by `{key, url}` in the request body rather than by an id in the
 * path — unlike every other delete-shaped operation in this document. Safe
 * to retry: deleting a subscription that is already gone is a no-op, not an
 * error, which is why this is marked idempotent.
 */
interface Input {
  key: string;
  url: string;
}

const deleteWebhook: ActionDefinition<Input> = {
  key: "delete-webhook",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook",
  description: "Unsubscribe a URL from a Judge.me event, identified by the exact key/url pair.",
  idempotent: true,
  params: [
    { key: "key", label: "Event Key", type: "string", required: true },
    { key: "url", label: "Webhook URL", type: "string", required: true },
  ],
  output: [
    { key: "ok", type: "boolean", label: "Whether the delete request succeeded" },
  ],

  async execute(input, ctx) {
    await new JudgeMeClient(ctx).status("/webhooks", {
      method: "DELETE",
      body: { key: input.key, url: input.url },
    });
    return { ok: true };
  },
};

export default deleteWebhook;
