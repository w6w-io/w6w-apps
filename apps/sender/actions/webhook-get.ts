import type { ActionDefinition } from "@w6w/types";
import { SenderClient } from "../lib/client.ts";

/** `GET /v2/account/webhooks/{id}` — a single webhook. Paid plans only. */
interface Input {
  id: string;
}

const webhookGet: ActionDefinition<Input> = {
  key: "webhook-get",
  type: "read",
  resource: "webhook",
  title: "Get Webhook",
  description: "Get a single account webhook by ID. Paid plans only.",
  params: [{ key: "id", label: "Webhook ID", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "Webhook ID" },
    { key: "url", type: "string", label: "URL" },
    { key: "topic", type: "string", label: "Topic" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    return new SenderClient(ctx).data(`/account/webhooks/${encodeURIComponent(input.id)}`);
  },
};

export default webhookGet;
