import type { ActionDefinition } from "@w6w/types";
import { MissiveClient } from "../lib/client.ts";

interface Input {
  id: string;
}

/**
 * `DELETE /v1/hooks/:id` — verified against
 * `missiveapp.com/docs/developers/rest-api/endpoints` §Hooks, 2026-08-29.
 * Behind the scenes this deletes the rule containing the webhook action.
 */
const action: ActionDefinition<Input> = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook Subscription",
  description: "Delete a webhook subscription (its underlying rule).",
  idempotent: true,
  params: [
    { key: "id", label: "Webhook ID", type: "string", required: true },
  ],
  output: [
    { key: "status", type: "number", label: "HTTP status" },
  ],

  async execute(input, ctx) {
    if (!input.id) throw new Error("`id` is required");
    ctx.log("info", "deleting Missive webhook", { id: input.id });
    const status = await new MissiveClient(ctx).status(`/hooks/${encodeURIComponent(input.id)}`, {
      method: "DELETE",
    });
    return { status };
  },
};

export default action;
