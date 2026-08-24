import type { ActionDefinition } from "@w6w/types";
import { GrainClient } from "../lib/client.ts";
import { recordingIdParam, successOutput, tagParam } from "../lib/params.ts";

interface Input {
  recordingId: string;
  tag: string;
}

interface Output {
  success: boolean;
}

/** `PUT /_/public-api/v2/recordings/:recording_id/tags` — answers `{ "success": true }`. */
const recordingTagAdd: ActionDefinition<Input, Output> = {
  key: "recording-tag-add",
  type: "perform",
  resource: "recording",
  title: "Add Tag to Recording",
  description: "Add a tag to a recording.",
  // Adding the same tag twice is the same end state.
  idempotent: true,
  params: [recordingIdParam, tagParam],
  output: successOutput,

  async execute(input, ctx) {
    const body = await new GrainClient(ctx).request<{ success?: boolean }>(
      `/v2/recordings/${encodeURIComponent(input.recordingId)}/tags`,
      { method: "PUT", body: { tag: input.tag } },
    );
    return { success: body?.success ?? false };
  },
};

export default recordingTagAdd;
