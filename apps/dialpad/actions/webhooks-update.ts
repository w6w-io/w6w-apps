import type { ActionDefinition } from "@w6w/types";
import { DialpadClient, encodeId, stripSignatureSecret } from "../lib/client.ts";

/**
 * `PATCH /api/v2/webhooks/{id}` — update a webhook's URL or rotate its
 * signature secret.
 *
 * **Redacted.** See `lib/client.ts` for why `signature.secret` is stripped.
 * Sending the same body twice ends in the same state — declared idempotent.
 */
interface Input {
  webhookId: string;
  hookUrl?: string;
  secret?: string;
}

const webhooksUpdate: ActionDefinition<Input> = {
  key: "webhooks-update",
  type: "perform",
  resource: "webhook",
  title: "Update Webhook",
  description: "Update a webhook's Hook URL, or rotate its signature secret.",
  idempotent: true,
  params: [
    { key: "webhookId", label: "Webhook ID", type: "string", required: true },
    { key: "hookUrl", label: "Hook URL", type: "string" },
    {
      key: "secret",
      label: "Signature secret",
      type: "secret",
      hint: "Rotate the secret your receiver verifies payloads with.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Webhook ID" },
    { key: "hook_url", type: "string", label: "Hook URL" },
  ],

  async execute(input, ctx) {
    const webhook = await new DialpadClient(ctx).json(`/webhooks/${encodeId(input.webhookId)}`, {
      method: "PATCH",
      body: { hook_url: input.hookUrl, secret: input.secret },
    });
    return stripSignatureSecret(webhook);
  },
};

export default webhooksUpdate;
