import type { ActionDefinition } from "@w6w/types";
import { BrowseAiClient } from "../lib/client.ts";
import { robotIdParam, webhookIdParam } from "../lib/params.ts";

/**
 * `DELETE /v2/robots/{robotId}/webhooks/{webhookId}` — remove a webhook.
 * Idempotent for the same reason as `monitor-delete`: an already-deleted
 * webhook answers `404`, never a second success, so retrying converges rather
 * than duplicating a side effect.
 */
interface Input {
  robotId: string;
  webhookId: string;
}

interface Output {
  deleted: true;
}

const webhookDelete: ActionDefinition<Input, Output> = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook",
  description: "Remove a webhook from a robot.",
  idempotent: true,
  params: [robotIdParam, webhookIdParam],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    await new BrowseAiClient(ctx).request(
      `/robots/${encodeURIComponent(input.robotId)}/webhooks/${
        encodeURIComponent(input.webhookId)
      }`,
      { method: "DELETE" },
    );
    return { deleted: true };
  },
};

export default webhookDelete;
