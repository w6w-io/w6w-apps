import type { ActionDefinition } from "@w6w/types";
import { compact, OneSignalClient, resolveAppId } from "../lib/client.ts";
import { buildTargeting, TARGETING_PARAMS, type TargetingInput } from "../lib/params.ts";

/**
 * `POST /notifications` (channel discriminated by `email_subject`/`email_body`)
 * — verified against OneSignal's OpenAPI 3.1 document, whose `requestBody`
 * for this channel requires `app_id`, `email_subject`, `email_body`.
 *
 * ## The `?c=push`/`?c=email`/`?c=sms` split is a documentation artifact, not a real query parameter
 *
 * The OpenAPI document (and the readme.io reference site it renders) lists
 * three separate "pages" for Create Message — `/notifications?c=push`,
 * `?c=email`, `?c=sms` — each with its own required-field set. None of the
 * three declares an actual `c` query parameter, and the vendor's own curl
 * example posts to the bare `https://api.onesignal.com/notifications` with no
 * query string at all; the channel is inferred from which body fields are
 * present (`email_subject`/`email_body` here). Sending `?c=email` on the wire
 * would just be an unused, undocumented query string — this client never
 * does.
 */
interface Input extends TargetingInput {
  emailSubject: string;
  emailBody: string;
  emailFromName?: string;
  emailFromAddress?: string;
  emailTo?: string;
  idempotencyKey?: string;
}

const sendEmail: ActionDefinition<Input> = {
  key: "send-email",
  type: "perform",
  resource: "notification",
  title: "Send Email",
  description: "Send a transactional or promotional email to segments, aliases, or a filter.",
  idempotent: true,
  params: [
    { key: "emailSubject", label: "Subject", type: "string", required: true },
    { key: "emailBody", label: "Body (HTML)", type: "text", required: true },
    ...TARGETING_PARAMS,
    {
      key: "emailTo",
      label: "Direct Recipient Email",
      type: "string",
      default: "",
      hint: "Send to one address directly instead of targeting Segments/Aliases/Filters.",
      advanced: true,
    },
    { key: "emailFromName", label: "From Name", type: "string", default: "", advanced: true },
    {
      key: "emailFromAddress",
      label: "From Address",
      type: "string",
      default: "",
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
      email_subject: input.emailSubject,
      email_body: input.emailBody,
      email_to: input.emailTo,
      email_from_name: input.emailFromName,
      email_from_address: input.emailFromAddress,
      idempotency_key: input.idempotencyKey || ctx.invocation?.invocationId,
      ...buildTargeting(input),
      target_channel: "email",
    });
    return new OneSignalClient(ctx).json("/notifications", { method: "POST", body });
  },
};

export default sendEmail;
