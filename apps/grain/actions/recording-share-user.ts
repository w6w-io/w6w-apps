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
 * `PUT /_/public-api/v2/recordings/:recording_id/users` — `user_id` travels
 * in the body, not the path (unlike Unshare, below). Answers
 * `{ "success": true }`.
 */
const recordingShareUser: ActionDefinition<Input, Output> = {
  key: "recording-share-user",
  type: "perform",
  resource: "recording",
  title: "Share Recording to a User",
  description: "Share a recording with a workspace user.",
  // Sharing with the same user twice is the same end state.
  idempotent: true,
  params: [recordingIdParam, userIdParam],
  output: successOutput,

  async execute(input, ctx) {
    const body = await new GrainClient(ctx).request<{ success?: boolean }>(
      `/v2/recordings/${encodeURIComponent(input.recordingId)}/users`,
      { method: "PUT", body: { user_id: input.userId } },
    );
    return { success: body?.success ?? false };
  },
};

export default recordingShareUser;
