import type { ActionDefinition } from "@w6w/types";
import { compact, SenderClient } from "../lib/client.ts";

/**
 * `POST /v2/account/webhooks/{id}` — updates a webhook's URL, topic,
 * relation_id, or status. Paid plans only.
 *
 * The vendor's own endpoint uses `POST` (not `PATCH` or `PUT`) for an update,
 * confirmed by the worked example on `account-webhooks/update-webhook/`.
 */
interface Input {
  id: string;
  topic?: string;
  relationId?: string;
  url?: string;
  status?: string;
}

const webhookUpdate: ActionDefinition<Input> = {
  key: "webhook-update",
  type: "perform",
  resource: "webhook",
  title: "Update Webhook",
  description: "Update a webhook's URL, topic, relation_id, or status. Paid plans only.",
  idempotent: true,
  params: [
    { key: "id", label: "Webhook ID", type: "string", required: true },
    { key: "topic", label: "Topic", type: "string" },
    {
      key: "relationId",
      label: "Relation ID",
      type: "string",
      hint: "Required if the selected topic is groups/new-subscriber or groups/unsubscribed.",
    },
    { key: "url", label: "Webhook URL", type: "string" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [{ value: "ACTIVE", label: "Active" }, { value: "PAUSED", label: "Paused" }],
    },
  ],
  output: [
    { key: "id", type: "string", label: "Webhook ID" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    return new SenderClient(ctx).data(`/account/webhooks/${encodeURIComponent(input.id)}`, {
      method: "POST",
      body: compact({
        topic: input.topic,
        relation_id: input.relationId,
        url: input.url,
        status: input.status,
      }),
    });
  },
};

export default webhookUpdate;
