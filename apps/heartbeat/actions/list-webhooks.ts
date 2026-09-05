import type { ActionDefinition } from "@w6w/types";
import { HeartbeatClient } from "../lib/client.ts";

/** `GET /v0/webhooks` — every webhook registered on this API key. */
const listWebhooks: ActionDefinition<Record<string, never>> = {
  key: "list-webhooks",
  type: "read",
  resource: "webhook",
  title: "List Webhooks",
  description: "Return every webhook registered on this API key.",
  params: [],
  output: [{ key: "webhooks", type: "array", label: "Webhooks — [{id, url, trigger, createdAt}]" }],

  async execute(_input, ctx) {
    const webhooks = await new HeartbeatClient(ctx).json("/webhooks");
    return { webhooks };
  },
};

export default listWebhooks;
