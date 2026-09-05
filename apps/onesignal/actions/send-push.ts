import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, OneSignalClient, resolveAppId } from "../lib/client.ts";
import { buildTargeting, TARGETING_PARAMS, type TargetingInput } from "../lib/params.ts";

/**
 * `POST /notifications?c=push` — verified against OneSignal's OpenAPI 3.1
 * document (`requestBody` requires only `app_id` + `contents`, everything
 * else optional). `app_id` comes from the Connection, never from a param —
 * see `lib/client.ts`.
 *
 * The vendor documents four targeting modes as mutually exclusive
 * (`include_subscription_ids`, `included_segments`/`excluded_segments`,
 * `filters`, `include_aliases`); this action does not re-validate that —
 * OneSignal already returns a clear 400 — it just omits whichever fields the
 * caller left blank.
 */
interface Input extends TargetingInput {
  contents: string;
  headings?: string;
  subtitle?: string;
  url?: string;
  data?: unknown;
  sendAfter?: string;
  ttl?: number;
  idempotencyKey?: string;
}

const sendPush: ActionDefinition<Input> = {
  key: "send-push",
  type: "perform",
  resource: "notification",
  title: "Send Push Notification",
  description: "Send a push notification to segments, subscriptions, aliases, or a filter.",
  idempotent: true,
  params: [
    { key: "contents", label: "Message", type: "text", required: true },
    { key: "headings", label: "Title", type: "string", default: "" },
    ...TARGETING_PARAMS,
    { key: "subtitle", label: "Subtitle (iOS)", type: "string", default: "", advanced: true },
    {
      key: "url",
      label: "URL",
      type: "string",
      default: "",
      hint: "Opens when the notification is tapped.",
      advanced: true,
    },
    { key: "data", label: "Additional Data", type: "json", default: "", advanced: true },
    {
      key: "sendAfter",
      label: "Send After",
      type: "datetime",
      default: "",
      hint: "Schedule delivery for a future UTC date/time (ISO 8601).",
      advanced: true,
    },
    {
      key: "ttl",
      label: "TTL (seconds)",
      type: "number",
      default: "",
      hint: "How long a message may wait in a device's push queue before being discarded.",
      advanced: true,
    },
    {
      key: "idempotencyKey",
      label: "Idempotency Key",
      type: "string",
      default: "",
      hint: "Reuse the same key when retrying to avoid sending a duplicate. Use " +
        "{{invocation.invocationId}} for an automatic one.",
      advanced: true,
    },
  ],
  output: [
    { key: "id", type: "string", label: "Message ID" },
    { key: "external_id", type: "string", label: "External / idempotency ID" },
  ],

  execute(input, ctx) {
    const appId = resolveAppId(ctx.connection);
    const body = compact({
      app_id: appId,
      contents: { en: input.contents },
      headings: input.headings ? { en: input.headings } : undefined,
      subtitle: input.subtitle ? { en: input.subtitle } : undefined,
      url: input.url,
      data: asOptionalJson(input.data, "data"),
      send_after: input.sendAfter,
      ttl: input.ttl,
      idempotency_key: input.idempotencyKey || ctx.invocation?.invocationId,
      ...buildTargeting(input),
      // The vendor's own examples always set this explicitly for a push send,
      // even though it defaults to "push" server-side.
      target_channel: input.targetChannel || "push",
    });
    return new OneSignalClient(ctx).json("/notifications", { method: "POST", body });
  },
};

export default sendPush;
