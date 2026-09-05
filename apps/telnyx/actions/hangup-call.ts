import type { ActionDefinition } from "@w6w/types";
import { TelnyxClient } from "../lib/client.ts";

interface Input {
  callControlId: string;
  clientState?: string;
  commandId?: string;
}

/**
 * `POST /calls/{call_control_id}/actions/hangup` — end an active call leg.
 * `call_control_id` comes from `make-call`'s response, or from the
 * `call_control_id` on an inbound `call.initiated` webhook for a call this
 * app did not place. The response is a bare `{"result": "ok"}` — Telnyx's
 * shared `Call Control Command Result` shape for every in-call action.
 */
const hangupCall: ActionDefinition<Input> = {
  key: "hangup-call",
  type: "perform",
  resource: "call",
  title: "Hangup Call",
  description: "End an active call by its Call Control ID.",
  // Retrying a Hangup once the call is already down surfaces as a 422 rather
  // than a second side effect, so this is safe to retry.
  idempotent: true,
  params: [
    {
      key: "callControlId",
      label: "Call Control ID",
      type: "string",
      required: true,
      hint: "From Make Call's response, or the `call_control_id` on an inbound webhook.",
    },
    { key: "clientState", label: "Client state", type: "string" },
    {
      key: "commandId",
      label: "Command ID",
      type: "string",
      hint: "Telnyx ignores a repeat Hangup carrying the same command_id.",
    },
  ],
  output: [{ key: "result", type: "string", label: "Command result" }],

  execute(input, ctx) {
    return new TelnyxClient(ctx).data<{ result?: string }>(
      `/calls/${encodeURIComponent(input.callControlId)}/actions/hangup`,
      {
        method: "POST",
        body: { client_state: input.clientState, command_id: input.commandId },
      },
    );
  },
};

export default hangupCall;
