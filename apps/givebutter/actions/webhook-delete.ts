import type { ActionDefinition } from "@w6w/types";
import { GivebutterClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  id: string;
}

const webhookDelete: ActionDefinition<Input> = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook",
  description: "Delete a webhook.",
  idempotent: true,
  params: [idParam("Webhook")],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const status = await new GivebutterClient(ctx).status(
      `/webhooks/${encodeURIComponent(input.id)}`,
      { method: "DELETE" },
    );
    return { status };
  },
};

export default webhookDelete;
