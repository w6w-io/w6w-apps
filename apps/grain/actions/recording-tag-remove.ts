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

/**
 * `DELETE /_/public-api/v2/recordings/:recording_id/tags/:tag` — the tag is
 * a path segment here, not a body field. Answers `{ "success": true }`.
 */
const recordingTagRemove: ActionDefinition<Input, Output> = {
  key: "recording-tag-remove",
  type: "perform",
  resource: "recording",
  title: "Remove Tag from Recording",
  description: "Remove a tag from a recording.",
  // Removing an already-absent tag is the same end state.
  idempotent: true,
  params: [recordingIdParam, tagParam],
  output: successOutput,

  async execute(input, ctx) {
    const body = await new GrainClient(ctx).request<{ success?: boolean }>(
      `/v2/recordings/${encodeURIComponent(input.recordingId)}/tags/${
        encodeURIComponent(input.tag)
      }`,
      { method: "DELETE" },
    );
    return { success: body?.success ?? false };
  },
};

export default recordingTagRemove;
