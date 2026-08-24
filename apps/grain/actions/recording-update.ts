import type { ActionDefinition } from "@w6w/types";
import { GrainClient } from "../lib/client.ts";
import { recordingIdParam, successOutput } from "../lib/params.ts";

interface Input {
  recordingId: string;
  title: string;
}

interface Output {
  success: boolean;
}

/**
 * `PATCH /_/public-api/v2/recordings/:recording_id` — the only documented
 * field is `title`. Answers `{ "success": true }`.
 */
const recordingUpdate: ActionDefinition<Input, Output> = {
  key: "recording-update",
  type: "perform",
  resource: "recording",
  title: "Update Recording",
  description: "Rename a recording.",
  // Setting the same title again produces the same end state.
  idempotent: true,
  params: [
    recordingIdParam,
    { key: "title", label: "New Title", type: "string", required: true },
  ],
  output: successOutput,

  async execute(input, ctx) {
    const body = await new GrainClient(ctx).request<{ success?: boolean }>(
      `/v2/recordings/${encodeURIComponent(input.recordingId)}`,
      { method: "PATCH", body: { title: input.title } },
    );
    return { success: body?.success ?? false };
  },
};

export default recordingUpdate;
