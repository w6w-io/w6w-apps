import type { ActionDefinition } from "@w6w/types";
import { LivestormClient } from "../lib/client.ts";

interface Input {
  id: string;
}

const webhookDelete: ActionDefinition<Input> = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook",
  description: "Delete a webhook subscription.",
  idempotent: true,
  params: [{ key: "id", label: "Webhook ID", type: "string", required: true }],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const status = await new LivestormClient(ctx).status(
      `/webhooks/${encodeURIComponent(input.id)}`,
      { method: "DELETE" },
    );
    return { status };
  },
};

export default webhookDelete;
