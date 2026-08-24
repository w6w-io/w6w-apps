import type { ActionDefinition } from "@w6w/types";
import { SystemeClient } from "../lib/client.ts";

interface Input {
  id: string;
}

const webhookDelete: ActionDefinition<Input> = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook",
  description: "Remove a Webhook resource.",
  idempotent: true,
  params: [
    { key: "id", label: "Webhook ID", type: "string", required: true },
  ],
  output: [
    { key: "status", type: "number", label: "HTTP status" },
  ],

  async execute(input, ctx) {
    const status = await new SystemeClient(ctx).status(
      `/api/webhooks/${encodeURIComponent(input.id)}`,
    );
    return { status };
  },
};

export default webhookDelete;
