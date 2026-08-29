import type { ActionDefinition } from "@w6w/types";
import { DialpadClient, encodeId, stripSignatureSecret } from "../lib/client.ts";

/**
 * `GET /api/v2/webhooks/{id}` — get one webhook by id.
 *
 * **Redacted.** See `lib/client.ts` for why `signature.secret` is stripped.
 */
interface Input {
  webhookId: string;
}

const webhooksGet: ActionDefinition<Input> = {
  key: "webhooks-get",
  type: "read",
  resource: "webhook",
  title: "Get Webhook",
  description: "Get a webhook by id.",
  params: [
    { key: "webhookId", label: "Webhook ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Webhook ID" },
    { key: "hook_url", type: "string", label: "Hook URL" },
  ],

  async execute(input, ctx) {
    const webhook = await new DialpadClient(ctx).json(`/webhooks/${encodeId(input.webhookId)}`);
    return stripSignatureSecret(webhook);
  },
};

export default webhooksGet;
