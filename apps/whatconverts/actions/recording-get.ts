import type { ActionDefinition } from "@w6w/types";
import { encodeBase64, WhatConvertsClient } from "../lib/client.ts";

interface Input {
  leadId: number;
}

interface Output {
  content: string;
  contentType: string;
  encoding: "base64";
}

/**
 * `GET /recording` — the MP3 recording for a phone-call lead.
 *
 * Verified against `whatconverts.com/api/recordings/` on 2026-08-29: "MP3 file is returned
 * in the response" — the vendor's only documented response shape is the raw audio bytes,
 * not JSON. Base64-encoded here so binary content survives JSON serialization through a
 * workflow step's result, the same approach as this pack's other binary-download actions
 * (see `apps/box/actions/download-file.ts`).
 *
 * A `phone_call` lead's own `recording`/`play_recording` fields (from `lead-get`/
 * `leads-list`) are already direct, browser-usable URLs — this action exists for a
 * workflow that needs the audio bytes themselves (to attach to an email, upload elsewhere,
 * or run through transcription), not merely to link to them.
 */
const recordingGet: ActionDefinition<Input, Output> = {
  key: "recording-get",
  type: "read",
  resource: "recording",
  title: "Get Recording",
  description: "Download the MP3 call recording for a lead, base64-encoded.",
  params: [
    {
      key: "leadId",
      label: "Lead ID",
      type: "number",
      required: true,
      hint: "The lead whose call recording to return.",
    },
  ],
  output: [
    { key: "content", type: "string", label: "Base64-encoded MP3 bytes" },
    { key: "contentType", type: "string", label: "Response content type" },
    { key: "encoding", type: "string", label: "Always base64" },
  ],

  async execute(input, ctx) {
    const { contentType, bytes } = await new WhatConvertsClient(ctx).raw("/recording", {
      lead_id: input.leadId,
    });
    return { content: encodeBase64(bytes), contentType, encoding: "base64" };
  },
};

export default recordingGet;
