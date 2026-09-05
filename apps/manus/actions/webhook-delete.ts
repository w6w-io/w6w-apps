import type { ActionDefinition } from "@w6w/types";
import { ManusClient, type TaskMutateResponse } from "../lib/client.ts";

interface Input {
  webhookId: string;
}

/**
 * `POST /v2/webhook.delete` — remove a webhook; it stops receiving
 * notifications immediately. `idempotent: true`: the end state after one
 * call and after five is the same webhook gone.
 */
const webhookDelete: ActionDefinition<Input, TaskMutateResponse> = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook",
  description: "Delete a webhook. Notifications stop immediately.",
  idempotent: true,
  params: [
    { key: "webhookId", label: "Webhook ID", type: "string", required: true },
  ],
  output: [],

  execute(input, ctx) {
    return new ManusClient(ctx).request<TaskMutateResponse>("/v2/webhook.delete", {
      method: "POST",
      body: { webhook_id: input.webhookId },
    });
  },
};

export default webhookDelete;
