import type { ActionDefinition } from "@w6w/types";
import { QuoClient } from "../lib/client.ts";
import { webhookOutputFields } from "../lib/params.ts";

/** `GET /v1/webhooks/{id}` — get a legacy webhook by its unique identifier. */
interface Input {
  id: string;
}

const webhookGet: ActionDefinition<Input> = {
  key: "webhook-get",
  type: "read",
  resource: "webhook",
  title: "Get Webhook",
  description: "Get a legacy webhook by its unique identifier.",
  params: [
    { key: "id", label: "Webhook ID", type: "string", required: true, placeholder: "WH123abc" },
  ],
  output: webhookOutputFields,

  execute(input, ctx) {
    return new QuoClient(ctx).json(`/webhooks/${encodeURIComponent(input.id)}`);
  },
};

export default webhookGet;
