import type { ActionDefinition } from "@w6w/types";
import { AircallClient, encodeId } from "../lib/client.ts";
import { callIdParam } from "../lib/params.ts";

interface Input {
  callId: string;
}

/**
 * `POST /v1/calls/:id/resume_recording` — resume a recording paused with the
 * Pause Call Recording action. Answers **204**.
 *
 * Same two mis-readable failures as the pause endpoint: **400** means the Call
 * already ended, and **405** means recording is disabled on that Number — a
 * configuration state, not a wrong verb.
 */
const callRecordingResume: ActionDefinition<Input> = {
  key: "call-recording-resume",
  type: "perform",
  resource: "call",
  title: "Resume Call Recording",
  description: "Resume live recording on an in-progress Call after a compliance pause.",
  // Safe to retry: resuming an already-running recording leaves the same state.
  idempotent: true,
  params: [callIdParam],
  output: [{ key: "status", type: "number", label: "HTTP status — 204 on success" }],

  async execute(input, ctx) {
    const client = new AircallClient(ctx);
    ctx.log("info", "resuming call recording", { callId: input.callId });
    const status = await client.status(`/calls/${encodeId(input.callId)}/resume_recording`, {
      method: "POST",
    });
    return { status };
  },
};

export default callRecordingResume;
