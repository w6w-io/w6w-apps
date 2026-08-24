import type { ActionDefinition } from "@w6w/types";
import { GrainClient } from "../lib/client.ts";
import { recordingIdParam, successOutput, userIdParam } from "../lib/params.ts";

interface Input {
  recordingId: string;
  userId: string;
}

interface Output {
  success: boolean;
}

/**
 * `DELETE /_/public-api/v2/recordings/:recording_id/users/:user_id` —
 * `user_id` is a path segment here, matching its own "Endpoint" line and
 * example request. Answers `{ "success": true }`.
 */
const recordingUnshareUser: ActionDefinition<Input, Output> = {
  key: "recording-unshare-user",
  type: "perform",
  resource: "recording",
  title: "Unshare Recording from a User",
  description: "Remove a workspace user's access to a shared recording.",
  // Un-sharing from an already-unshared user is the same end state.
  idempotent: true,
  params: [recordingIdParam, userIdParam],
  output: successOutput,

  async execute(input, ctx) {
    const body = await new GrainClient(ctx).request<{ success?: boolean }>(
      `/v2/recordings/${encodeURIComponent(input.recordingId)}/users/${
        encodeURIComponent(input.userId)
      }`,
      { method: "DELETE" },
    );
    return { success: body?.success ?? false };
  },
};

export default recordingUnshareUser;
