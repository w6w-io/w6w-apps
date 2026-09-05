import type { ActionDefinition } from "@w6w/types";
import { compact, OneSignalClient, resolveAppId, toList } from "../lib/client.ts";
import { buildTargeting, TARGETING_PARAMS, type TargetingInput } from "../lib/params.ts";

/**
 * `POST /notifications` (channel discriminated by `target_channel: "sms"`) —
 * verified against OneSignal's OpenAPI 3.1 document, whose `requestBody` for
 * this channel requires `app_id`, `contents`, `target_channel`. Unlike push
 * and email, `target_channel` is a **required** field here rather than an
 * inferred default — this action always sends it.
 *
 * See `actions/send-email.ts` for why this never sends a `?c=sms` query string.
 */
interface Input extends TargetingInput {
  contents: string;
  smsFrom?: string;
  includePhoneNumbers?: string;
  idempotencyKey?: string;
}

const sendSms: ActionDefinition<Input> = {
  key: "send-sms",
  type: "perform",
  resource: "notification",
  title: "Send SMS",
  description: "Send an SMS or MMS message to segments, subscriptions, aliases, or a filter.",
  idempotent: true,
  params: [
    { key: "contents", label: "Message", type: "text", required: true },
    ...TARGETING_PARAMS,
    {
      key: "includePhoneNumbers",
      label: "Direct Phone Numbers",
      type: "string",
      default: "",
      hint: "Comma-separated E.164 numbers to send to directly, instead of targeting " +
        "Segments/Subscription IDs/Aliases/Filters.",
      advanced: true,
    },
    {
      key: "smsFrom",
      label: "From Number",
      type: "string",
      default: "",
      hint: "Defaults to the app's configured SMS sender.",
      advanced: true,
    },
    {
      key: "idempotencyKey",
      label: "Idempotency Key",
      type: "string",
      default: "",
      hint: "Reuse the same key when retrying to avoid sending a duplicate.",
      advanced: true,
    },
  ],
  output: [
    { key: "id", type: "string", label: "Message ID" },
  ],

  execute(input, ctx) {
    const appId = resolveAppId(ctx.connection);
    const body = compact({
      app_id: appId,
      contents: { en: input.contents },
      include_phone_numbers: toList(input.includePhoneNumbers),
      sms_from: input.smsFrom,
      idempotency_key: input.idempotencyKey || ctx.invocation?.invocationId,
      ...buildTargeting(input),
      target_channel: "sms",
    });
    return new OneSignalClient(ctx).json("/notifications", { method: "POST", body });
  },
};

export default sendSms;
