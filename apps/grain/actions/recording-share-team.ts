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
 * **Known doc inconsistency, verified 2026-08-24**: Grain's "Endpoint" line
 * for Share Recording to a Team reads
 * `PUT /_/public-api/v2/recordings/:recording_id/teams/:team_id`, but the
 * page's own "Example Request" for the same section `curl`s
 * `.../recordings/:recording_id/teams` (no `team_id` segment) with
 * `--data '{"team_id": "..."}'` — matching the sibling "Share Recording to
 * an User" endpoint's shape (`user_id` in the body, not the path) rather
 * than its stated path. This is almost certainly copy-paste drift from the
 * adjacent "Unshare Recording from a Team" section, which DOES use
 * `:team_id` in both its Endpoint line and its example.
 *
 * This action follows the **example**, not the prose "Endpoint" line: a
 * runnable `curl` command is far less likely to be a documentation typo than
 * a one-line path summary is, and the example's shape is internally
 * consistent with the same page's own "Share Recording to an User" section.
 * If Grain's API in fact expects `team_id` as a path segment, this call will
 * surface that as a documented error rather than silently succeeding against
 * the wrong resource.
 */
const recordingShareTeam: ActionDefinition<Input, Output> = {
  key: "recording-share-team",
  type: "perform",
  resource: "recording",
  title: "Share Recording to a Team",
  description: "Share a recording with a workspace team.",
  // Sharing with the same team twice is the same end state.
  idempotent: true,
  params: [recordingIdParam, teamIdParam],
  output: successOutput,

  async execute(input, ctx) {
    const body = await new GrainClient(ctx).request<{ success?: boolean }>(
      `/v2/recordings/${encodeURIComponent(input.recordingId)}/teams`,
      { method: "PUT", body: { team_id: input.teamId } },
    );
    return { success: body?.success ?? false };
  },
};

export default recordingShareTeam;
