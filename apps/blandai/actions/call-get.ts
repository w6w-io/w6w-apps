import type { ActionDefinition } from "@w6w/types";
import { BlandClient } from "../lib/client.ts";

/**
 * `GET /v1/calls/{call_id}` — full detail, metadata, and transcript for one call.
 *
 * Verified against `docs.bland.ai/api-v1/get/calls-id`. Returns the flat call
 * object directly (not the `{data, errors}` envelope) — confirmed in the
 * doc's own response example.
 */
interface Input {
  callId: string;
}

const callGet: ActionDefinition<Input> = {
  key: "call-get",
  type: "read",
  resource: "call",
  title: "Get Call",
  description: "Retrieve detailed information, metadata, and the transcript for a call.",
  params: [
    { key: "callId", label: "Call ID", type: "string", required: true },
  ],
  output: [
    { key: "callId", type: "string", label: "Call ID" },
    { key: "status", type: "string", label: "Call status" },
    { key: "completed", type: "boolean", label: "Whether the call finished" },
    { key: "callLength", type: "number", label: "Length in minutes" },
    { key: "to", type: "string", label: "Destination number" },
    { key: "from", type: "string", label: "Origin number" },
    { key: "answeredBy", type: "string", label: "human, voicemail, unknown, no-answer, or null" },
    { key: "summary", type: "string", label: "AI-generated call summary" },
    { key: "concatenatedTranscript", type: "string", label: "Full transcript as one string" },
    { key: "transcripts", type: "array", label: "Per-utterance transcript entries" },
    { key: "recordingUrl", type: "string", label: "Recording URL, if record was true" },
    { key: "analysis", type: "object", label: "Structured post-call analysis, if requested" },
    { key: "variables", type: "object", label: "Variables captured during the call" },
    { key: "price", type: "number", label: "Cost of the call in USD" },
    { key: "errorMessage", type: "string", label: "Error detail, if the call failed" },
  ],

  async execute(input, ctx) {
    const call = await new BlandClient(ctx).request<Record<string, unknown>>(
      `/v1/calls/${encodeURIComponent(input.callId)}`,
    );

    return {
      callId: call.call_id,
      status: call.status,
      completed: call.completed,
      callLength: call.call_length,
      to: call.to,
      from: call.from,
      answeredBy: call.answered_by,
      summary: call.summary,
      concatenatedTranscript: call.concatenated_transcript,
      transcripts: call.transcripts ?? [],
      recordingUrl: call.recording_url,
      analysis: call.analysis,
      variables: call.variables,
      price: call.price,
      errorMessage: call.error_message,
    };
  },
};

export default callGet;
