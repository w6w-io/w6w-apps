import type { ActionDefinition } from "@w6w/types";
import { encodeId, TidyCalClient } from "../lib/client.ts";
import { teamIdParam } from "../lib/params.ts";

/**
 * `DELETE /api/teams/{team}/users/{teamUser}` — remove a member.
 *
 * `teamUser` is the **membership** id from List team users, not a user id.
 * Confirmed live on 2026-08-11: the path exists and accepts only `DELETE` (any
 * other verb answers `405` with `Allow: DELETE`).
 *
 * `idempotent: true` — removal converges. A retry after a dropped connection
 * finds the member already gone and TidyCal answers `422 — User not found in
 * team`, which surfaces as an error rather than removing someone else.
 *
 * The response is `{"message": "User removed from team"}`.
 */
interface Input {
  team: number;
  teamUser: number;
}

const teamUserRemove: ActionDefinition<Input> = {
  key: "team-user-remove",
  type: "perform",
  resource: "team-user",
  title: "Remove user from team",
  description: "Remove a member from a team by their team-membership ID.",
  idempotent: true,
  params: [
    teamIdParam,
    {
      key: "teamUser",
      label: "Team membership ID",
      type: "number",
      required: true,
      validation: { integer: true },
      hint: "The `id` from List team users. This is a membership ID, not a user ID — the " +
        "`host_id` filter on List team bookings takes a different number.",
    },
  ],
  output: [{ key: "message", type: "string", label: "Result message" }],

  execute(input, ctx) {
    return new TidyCalClient(ctx).json(
      `/teams/${encodeId(input.team)}/users/${encodeId(input.teamUser)}`,
      { method: "DELETE" },
    );
  },
};

export default teamUserRemove;
