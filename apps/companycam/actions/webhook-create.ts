import type { ActionDefinition } from "@w6w/types";
import { compact, CompanyCamClient, stripWebhookSecret, toList } from "../lib/client.ts";
import { webhookScopeOptions } from "../lib/webhook-scopes.ts";

/**
 * `POST /v2/webhooks` — subscribe to events.
 *
 * ## The token is yours to choose, and it is the only thing that makes a
 * delivery trustworthy
 *
 * CompanyCam does not generate a signing secret: you send `token`, and it signs
 * every delivery with it — base64 HMAC-SHA1 of the raw body, in the
 * `X-CompanyCam-Signature` header. Omit it and the receiving endpoint has no
 * way to tell a real delivery from anyone who guesses the URL. This action
 * accepts it as a `secret` param and deletes it from the response, so it never
 * lands in a run record in the clear.
 *
 * ## Retries, and how a subscription dies
 *
 * The vendor documents this precisely: a delivery must answer exactly `200`;
 * anything else is retried with exponential backoff up to 10 attempts. **A
 * webhook whose total error count passes 25 is disabled**, and the counter
 * resets only on a success. So a receiver that answers `202` on purpose will
 * be switched off after 25 deliveries, silently — check `enabled` with
 * `webhook-get` when events stop arriving.
 *
 * ## Scopes
 *
 * The vocabulary is fixed and hierarchical: `*` matches everything,
 * `project.*` matches every project event, and the leaves are named events.
 * Note `todo_list.*` — checklists are called todo lists in the event names but
 * checklists everywhere else in the API.
 *
 * Not idempotent: nothing de-duplicates by URL, so a retry leaves two
 * subscriptions and every event is then delivered twice, forever, with nothing
 * to notice it by.
 */
interface Input {
  url: string;
  scopes: string[] | string;
  token?: string;
  enabled?: boolean;
}

const webhookCreate: ActionDefinition<Input> = {
  key: "webhook-create",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook",
  description:
    "Subscribe a URL to CompanyCam events. Supply a token to make deliveries verifiable; the " +
    "response never carries it back.",
  idempotent: false,
  params: [
    {
      key: "url",
      label: "Target URL",
      type: "string",
      required: true,
      hint: "Must answer exactly HTTP 200. Anything else is retried, and 25 total errors " +
        "disable the webhook.",
    },
    {
      key: "scopes",
      label: "Event scopes",
      type: "multiselect",
      required: true,
      options: webhookScopeOptions,
      hint: "Checklist events are named todo_list.* — the only place in this API that spelling " +
        "appears.",
    },
    {
      key: "token",
      label: "Signing token",
      type: "secret",
      hint: "Your own random string. CompanyCam signs each delivery with it (base64 HMAC-SHA1 " +
        "of the body, in X-CompanyCam-Signature). Without one, deliveries cannot be verified.",
    },
    {
      key: "enabled",
      label: "Enabled",
      type: "boolean",
      default: true,
      hint: "Create it disabled to register the endpoint before it is ready.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Webhook ID" },
    { key: "url", type: "string", label: "Target URL" },
    { key: "scopes", type: "array", label: "Event scopes" },
    { key: "enabled", type: "boolean", label: "Enabled" },
  ],

  execute(input, ctx) {
    const scopes = toList(input.scopes);
    if (!scopes?.length) throw new Error("At least one event scope is required");

    return new CompanyCamClient(ctx)
      .json("/webhooks", {
        method: "POST",
        body: compact({
          url: input.url,
          scopes,
          token: input.token,
          enabled: input.enabled,
        }),
      })
      .then(stripWebhookSecret);
  },
};

export default webhookCreate;
