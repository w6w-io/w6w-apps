import type { ActionDefinition } from "@w6w/types";
import { CloudConvertClient, toArray } from "../lib/client.ts";
import { webhookEventOptions } from "../lib/params.ts";

/**
 * `POST /v2/webhooks` — create an account-wide webhook.
 *
 * ## The response hands back the signing secret — by design, not by accident
 *
 * CloudConvert's own docs: "You can show the signing secret in your webhook settings
 * using the [Show] button" — meaning the dashboard and this endpoint are the *only* two
 * places to retrieve it, there is no separate "reveal secret" call. So unlike Apify's
 * `proxy.password` (a credential nobody asked this app to hand back), `signing_secret`
 * here is the intended output of the very call that creates it: it is what the caller
 * needs to validate the `CloudConvert-Signature` header on future deliveries. Treat this
 * action's result as sensitive and store the secret the same way you would any other
 * credential.
 *
 * `idempotent: false`: unlike `webhook-create`'s sibling in CloudConvert's own **job**
 * creation (which documents no key here either) or Apify's webhook create (which takes
 * an explicit `idempotencyKey`), CloudConvert's webhook endpoint documents no
 * idempotency key at all — every call creates a new webhook.
 */
interface Input {
  url: string;
  events: string[] | string;
}

const webhookCreate: ActionDefinition<Input> = {
  key: "webhook-create",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook",
  description: "Create an account-wide webhook for job lifecycle events. The response " +
    "includes the signing secret — store it securely, it is not shown again outside the " +
    "CloudConvert dashboard.",
  idempotent: false,
  params: [
    {
      key: "url",
      label: "Webhook URL",
      type: "string",
      required: true,
      hint: "The URL CloudConvert will POST notifications to.",
    },
    {
      key: "events",
      label: "Events",
      type: "multiselect",
      required: true,
      options: webhookEventOptions,
    },
  ],
  output: [
    { key: "id", type: "number", label: "Webhook ID" },
    { key: "url", type: "string", label: "URL" },
    { key: "events", type: "array", label: "Subscribed events" },
    { key: "signing_secret", type: "string", label: "Signing secret (HMAC-SHA256)" },
  ],

  execute(input, ctx) {
    ctx.log("info", "creating CloudConvert webhook", { url: input.url });
    return new CloudConvertClient(ctx).data(`/webhooks`, {
      method: "POST",
      body: { url: input.url, events: toArray(input.events) },
    });
  },
};

export default webhookCreate;
