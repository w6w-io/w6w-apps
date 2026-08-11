import type { ActionDefinition } from "@w6w/types";
import { AircallClient, encodeId, flag } from "../lib/client.ts";
import { type CallExpansionInput, callExpansionParams, callIdParam } from "../lib/params.ts";

interface Input extends CallExpansionInput {
  callId: string;
}

/**
 * `GET /v1/calls/:id` — one Call, unwrapped from its `{"call": …}` envelope.
 *
 * `fetchContact` is off by default here exactly as it is on the vendor's side:
 * without it the response carries `contact: null` even for a call that plainly
 * matched a Contact, which reads as "unknown caller" and is not.
 *
 * The recording and voicemail URLs in the response are **short-lived** — the
 * direct `recording` / `voicemail` links expire after 1 hour and the
 * `*_short_url` forms after 3 — so store the audio, not the link.
 */
const callGet: ActionDefinition<Input> = {
  key: "call-get",
  type: "read",
  resource: "call",
  title: "Retrieve Call",
  description: "Fetch one Call by id, with its user, number, comments, tags and recording links.",
  params: [callIdParam, ...callExpansionParams()],
  output: [
    { key: "id", type: "number", label: "Call ID" },
    { key: "sid", type: "string", label: "Provider call identifier (same value as call_uuid)" },
    { key: "direction", type: "string", label: "inbound | outbound" },
    { key: "status", type: "string", label: "initial | answered | done" },
    { key: "duration", type: "number", label: "ended_at - started_at, in seconds (includes ring)" },
    { key: "missed_call_reason", type: "string", label: "Why an inbound call was missed" },
    { key: "recording", type: "string", label: "Direct recording URL — valid for 1 hour" },
    { key: "tags", type: "array", label: "Tags applied to the Call" },
    { key: "comments", type: "array", label: "Notes on the Call (maximum 5)" },
  ],

  async execute(input, ctx) {
    const client = new AircallClient(ctx);
    return await client.entity(`/calls/${encodeId(input.callId)}`, "call", {
      query: {
        fetch_contact: flag(input.fetchContact),
        fetch_short_urls: flag(input.fetchShortUrls),
        fetch_call_timeline: flag(input.fetchCallTimeline),
        fetch_aiva_conv: flag(input.fetchAivaConv),
      },
    });
  },
};

export default callGet;
