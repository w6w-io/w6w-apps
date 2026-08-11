import type { ActionDefinition } from "@w6w/types";
import { AircallClient, encodeId } from "../lib/client.ts";
import { callIdParam } from "../lib/params.ts";

interface Input {
  callId: string;
}

/**
 * `POST /v1/calls/:id/pause_recording` — pause live recording on a Call in
 * progress. Answers **204**.
 *
 * The usual reason to reach for this is compliance: stop capturing while a
 * caller reads out a card number, then resume.
 *
 * Read the failure codes carefully, because two of them are not what they look
 * like:
 *
 *  - **400** is "Call has already ended" — a timing problem, not a malformed
 *    request.
 *  - **405** is "Recording is disabled on the Call's number", i.e. a
 *    configuration state, not a wrong HTTP verb. Turning recording on is a
 *    per-Number setting in the Dashboard.
 */
const callRecordingPause: ActionDefinition<Input> = {
  key: "call-recording-pause",
  type: "perform",
  resource: "call",
  title: "Pause Call Recording",
  description:
    "Pause live recording on an in-progress Call — the compliance pause before a caller reads out " +
    "card details.",
  // Safe to retry: pausing an already-paused recording leaves the same state,
  // and a lost response during a compliance pause is exactly when a retry is
  // wanted rather than feared.
  idempotent: true,
  params: [callIdParam],
  output: [{ key: "status", type: "number", label: "HTTP status — 204 on success" }],

  async execute(input, ctx) {
    const client = new AircallClient(ctx);
    ctx.log("info", "pausing call recording", { callId: input.callId });
    const status = await client.status(`/calls/${encodeId(input.callId)}/pause_recording`, {
      method: "POST",
    });
    return { status };
  },
};

export default callRecordingPause;
