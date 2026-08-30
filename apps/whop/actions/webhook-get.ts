import type { ActionDefinition } from "@w6w/types";
import { WhopClient } from "../lib/client.ts";
import { webhookIdParam } from "../lib/params.ts";

interface Input {
  webhookId: string;
}

const webhookGet: ActionDefinition<Input> = {
  key: "webhook-get",
  type: "read",
  resource: "webhook",
  title: "Get Webhook",
  description: "Retrieve a webhook endpoint's configuration.",
  params: [webhookIdParam],
  output: [{ key: "data", type: "object", label: "The webhook" }],

  execute(input, ctx) {
    return new WhopClient(ctx).get(`/webhooks/${encodeURIComponent(input.webhookId)}`);
  },
};

export default webhookGet;
