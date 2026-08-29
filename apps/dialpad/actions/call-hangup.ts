import type { ActionDefinition } from "@w6w/types";
import { DialpadClient, encodeId } from "../lib/client.ts";

/**
 * `PUT /api/v2/call/{id}/actions/hangup` — hang up a call.
 *
 * The vendor documents no idempotency key and no "already ended" success case
 * for this endpoint, so a retry against a call that already hung up is
 * expected to fail rather than silently succeed a second time. Declared
 * non-idempotent on that conservative reading, matching the pack's rule that
 * `idempotent: true` is a claim about the *documented* end state, not a guess.
 */
interface Input {
  callId: string;
}

const callHangup: ActionDefinition<Input> = {
  key: "call-hangup",
  type: "perform",
  resource: "call",
  title: "Hang Up Call",
  description: "Hang up an in-progress call.",
  idempotent: false,
  params: [
    {
      key: "callId",
      label: "Call ID",
      type: "string",
      required: true,
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const status = await new DialpadClient(ctx).status(
      `/call/${encodeId(input.callId)}/actions/hangup`,
      { method: "PUT" },
    );
    return { status };
  },
};

export default callHangup;
