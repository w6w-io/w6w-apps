import type { ActionDefinition } from "@w6w/types";
import { TelnyxClient } from "../lib/client.ts";

interface Input {
  connectionId: string;
  from: string;
  to: string;
  fromDisplayName?: string;
  timeoutSecs?: number;
  timeLimitSecs?: number;
  webhookUrl?: string;
  clientState?: string;
  commandId?: string;
}

/**
 * Place an outbound call via Telnyx Call Control (`POST /calls`,
 * `CallRequest` in the OpenAPI document).
 *
 * **`connectionId` is a Call Control Application, not a phone number
 * setting.** The spec marks `connection_id` `required` alongside `to`/`from`
 * — it is the ID of a Call Control Application you create once in the
 * Telnyx portal (Voice → Call Control Applications). There is no way to dial
 * with only a phone number; skipping this is the single most common way a
 * first integration gets stuck on a 422.
 *
 * **The call is asynchronous.** The response carries a `call_control_id`
 * immediately, before the destination has answered. Whether/when it answers
 * (or hangs up) arrives later as a `call.answered` / `call.hangup` webhook —
 * this action does not wait for either. Keep the returned `call_control_id`
 * to pass to `hangup-call` or to correlate against the webhook payload.
 *
 * Only a single string destination is supported here — Telnyx's `to` also
 * accepts an array (simultaneous ring to multiple destinations) and inline
 * DTMF-on-answer shorthand appended to the string; neither is exposed by
 * this action.
 */
const makeCall: ActionDefinition<Input> = {
  key: "make-call",
  type: "perform",
  resource: "call",
  title: "Make Call",
  description: "Place an outbound call via a Telnyx Call Control Application.",
  idempotent: false,
  params: [
    {
      key: "connectionId",
      label: "Call Control Application ID",
      type: "string",
      required: true,
      hint: "The `connection_id` of a Call Control Application from the Telnyx portal — " +
        "not a phone number setting.",
    },
    {
      key: "from",
      label: "From",
      type: "string",
      required: true,
      hint: "Caller ID presented to the destination, in E.164 format.",
    },
    {
      key: "to",
      label: "To",
      type: "string",
      required: true,
      hint: "DID (E.164) or SIP URI to dial.",
    },
    { key: "fromDisplayName", label: "From display name", type: "string" },
    { key: "timeoutSecs", label: "Ring timeout (seconds)", type: "number" },
    { key: "timeLimitSecs", label: "Max call duration (seconds)", type: "number" },
    {
      key: "webhookUrl",
      label: "Webhook URL",
      type: "string",
      hint: "Overrides the Call Control Application's webhook URL for this call's events.",
    },
    {
      key: "clientState",
      label: "Client state",
      type: "string",
      hint: "Base64-encoded state echoed back on every subsequent webhook for this call.",
    },
    {
      key: "commandId",
      label: "Command ID",
      type: "string",
      hint: "Idempotency key — Telnyx ignores a repeat Dial carrying the same command_id.",
    },
  ],
  output: [{ key: "data", type: "object", label: "The dialed call leg" }],

  execute(input, ctx) {
    return new TelnyxClient(ctx).data("/calls", {
      method: "POST",
      body: {
        connection_id: input.connectionId,
        to: input.to,
        from: input.from,
        from_display_name: input.fromDisplayName,
        timeout_secs: input.timeoutSecs,
        time_limit_secs: input.timeLimitSecs,
        webhook_url: input.webhookUrl,
        client_state: input.clientState,
        command_id: input.commandId,
      },
    });
  },
};

export default makeCall;
