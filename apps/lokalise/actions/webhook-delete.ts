import type { ActionDefinition } from "@w6w/types";
import { encodeId, LokaliseClient } from "../lib/client.ts";
import { projectIdParam } from "../lib/params.ts";

/**
 * `DELETE /projects/{project_id}/webhooks/{webhook_id}` — remove a webhook.
 *
 * Idempotent: the end state after one call and after five is the same
 * webhook gone (a repeat call answers `404`, surfaced as an error).
 */
interface Input {
  projectId: string;
  webhookId: string;
}

const webhookDelete: ActionDefinition<Input> = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook",
  description: "Delete a webhook by id.",
  idempotent: true,
  params: [
    projectIdParam,
    {
      key: "webhookId",
      label: "Webhook ID",
      type: "string",
      required: true,
      hint: "From the `webhook_id` of a Create Webhook or List Webhooks result.",
    },
  ],
  output: [
    { key: "project_id", type: "string", label: "Project ID" },
    { key: "webhook_deleted", type: "boolean", label: "Whether the webhook was deleted" },
  ],

  execute(input, ctx) {
    return new LokaliseClient(ctx).json(
      `/projects/${encodeId(input.projectId)}/webhooks/${encodeId(input.webhookId)}`,
      { method: "DELETE" },
    );
  },
};

export default webhookDelete;
