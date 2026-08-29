import type { ActionDefinition } from "@w6w/types";
import { DialpadClient, stripSignatureSecret } from "../lib/client.ts";

/**
 * `POST /api/v2/webhooks` — register a new webhook. Returns a `WebhookProto`
 * with an `id` that event subscriptions (see `call-event-subscription-create`)
 * reference to say which webhook receives them; one webhook id can be shared
 * across several subscriptions.
 *
 * **Redacted.** The vendor's own OpenAPI example for this exact endpoint shows
 * the response verbatim: `"signature": {"algo": "HS256", "secret":
 * "test_secret", "type": "jwt"}` — this is Dialpad's live payload-signing
 * secret, handed back on the same call that creates it. Stripped here before
 * the action returns; see `lib/client.ts` for the full finding. The secret
 * remains visible to an admin in the Dialpad console.
 *
 * No idempotency key is documented, so calling this twice creates two
 * webhooks.
 */
interface Input {
  hookUrl: string;
  secret?: string;
}

const webhooksCreate: ActionDefinition<Input> = {
  key: "webhooks-create",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook",
  description: "Register a new webhook. Triggered events are sent as a signed POST to Hook URL.",
  idempotent: false,
  params: [
    {
      key: "hookUrl",
      label: "Hook URL",
      type: "string",
      required: true,
      hint: "The URL triggered events are POSTed to.",
    },
    {
      key: "secret",
      label: "Signature secret",
      type: "secret",
      hint: "A plain-text string used to sign the payload, so your receiver can verify it came " +
        "from Dialpad. Leave empty to let Dialpad generate one.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Webhook ID" },
    { key: "hook_url", type: "string", label: "Hook URL" },
  ],

  async execute(input, ctx) {
    const webhook = await new DialpadClient(ctx).json("/webhooks", {
      method: "POST",
      body: { hook_url: input.hookUrl, secret: input.secret },
    });
    return stripSignatureSecret(webhook);
  },
};

export default webhooksCreate;
