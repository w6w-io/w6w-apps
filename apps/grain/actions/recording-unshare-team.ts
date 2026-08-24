import type { ActionDefinition } from "@w6w/types";
import { GrainClient } from "../lib/client.ts";
import { recordingIdParam, successOutput, teamIdParam } from "../lib/params.ts";

interface Input {
  recordingId: string;
  teamId: string;
}

interface Output {
  success: boolean;
}

/**
 * `DELETE /_/public-api/v2/recordings/:recording_id/teams/:team_id` —
 * `team_id` is a path segment here; the Endpoint line and example agree
 * (unlike Share Recording to a Team — see the note in
 * `recording-share-team.ts`). Answers `{ "success": true }`.
 */
const recordingUnshareTeam: ActionDefinition<Input, Output> = {
  key: "recording-unshare-team",
  type: "perform",
  resource: "recording",
  title: "Unshare Recording from a Team",
  description: "Remove a workspace team's access to a shared recording.",
  // Un-sharing from an already-unshared team is the same end state.
  idempotent: true,
  params: [recordingIdParam, teamIdParam],
  output: successOutput,

  async execute(input, ctx) {
    const body = await new GrainClient(ctx).request<{ success?: boolean }>(
      `/v2/recordings/${encodeURIComponent(input.recordingId)}/teams/${
        encodeURIComponent(input.teamId)
      }`,
      { method: "DELETE" },
    );
    return { success: body?.success ?? false };
  },
};

export default recordingUnshareTeam;
