import type { ActionDefinition } from "@w6w/types";
import { SystemeClient } from "../lib/client.ts";

/** `GET /api/webhooks` — no query parameters documented for this operation. */
const webhookList: ActionDefinition<Record<string, never>> = {
  key: "webhook-list",
  type: "read",
  resource: "webhook",
  title: "List Webhooks",
  description: "Retrieve the collection of Webhook resources.",
  params: [],
  output: [
    { key: "items", type: "array", label: "Webhooks" },
    { key: "hasMore", type: "boolean", label: "Whether another page is available" },
  ],

  async execute(_input, ctx) {
    return await new SystemeClient(ctx).get("/api/webhooks");
  },
};

export default webhookList;
