import type { ActionDefinition } from "@w6w/types";
import { encodeId, TidyCalClient } from "../lib/client.ts";
import { pageParam, teamIdParam } from "../lib/params.ts";

/**
 * `GET /api/teams/{team}/users` — a team's members.
 *
 * The `id` on each row is a **`TeamUser` id, not a user id**, and the two are
 * used in different places: Remove user from team takes this `id`, while the
 * `host_id` filter on List team bookings takes a user id. Nothing in the
 * document maps one to the other, so treat them as separate namespaces.
 *
 * The row carries no role, despite Add user to team accepting one — so this
 * endpoint cannot tell you who the admins are.
 */
interface Input {
  team: number;
  page?: number;
}

const teamUserList: ActionDefinition<Input> = {
  key: "team-user-list",
  type: "search",
  resource: "team-user",
  title: "List team users",
  description: "List the members of a team. The `id` on each row is a team-membership ID.",
  params: [teamIdParam, pageParam],
  output: [{ key: "data", type: "array", label: "Team members" }],

  execute(input, ctx) {
    return new TidyCalClient(ctx).json(`/teams/${encodeId(input.team)}/users`, {
      query: { page: input.page },
    });
  },
};

export default teamUserList;
