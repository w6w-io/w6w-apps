import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, TidyCalClient } from "../lib/client.ts";
import { teamIdParam } from "../lib/params.ts";

/**
 * `POST /api/teams/{team}/users` — invite someone to a team.
 *
 * **This sends an email.** TidyCal's own summary is "Add a user to a team by
 * sending an invitation email", so the operation's real side effect lands in
 * someone's inbox, not in the API.
 *
 * The response is neither the envelope nor an entity: `{"message": "Invitation
 * sent successfully", "team_user_id": 123}`. That `team_user_id` is the handle
 * Remove user from team needs, and it is returned here and nowhere else at
 * invitation time.
 *
 * `idempotent: false`, and this is the one place in this app where that flag is
 * doing real work. A retry after a lost response does *not* converge: TidyCal
 * answers `422 — User already invited or already a member`, so an automatic
 * retry would report a failure for work that had in fact succeeded, having
 * already sent the invitation. Retrying is a human decision here.
 */
interface Input {
  team: number;
  email: string;
  role_name?: string;
}

const teamUserAdd: ActionDefinition<Input> = {
  key: "team-user-add",
  type: "perform",
  resource: "team-user",
  title: "Add user to team",
  description: "Invite a user to a team by email. Sends them an invitation email.",
  idempotent: false,
  params: [
    teamIdParam,
    {
      key: "email",
      label: "Email",
      type: "string",
      required: true,
      hint: "The invitation is sent to this address.",
    },
    {
      key: "role_name",
      label: "Role",
      type: "select",
      options: [
        { value: "admin", label: "Admin" },
        { value: "user", label: "User" },
      ],
      hint: "TidyCal documents no default. List team users does not report roles, so this is " +
        "write-only as far as the API is concerned.",
    },
  ],
  output: [
    { key: "message", type: "string", label: "Result message" },
    { key: "team_user_id", type: "number", label: "Team membership ID" },
  ],

  execute(input, ctx) {
    return new TidyCalClient(ctx).json(`/teams/${encodeId(input.team)}/users`, {
      method: "POST",
      body: compact({ email: input.email, role_name: input.role_name }),
    });
  },
};

export default teamUserAdd;
