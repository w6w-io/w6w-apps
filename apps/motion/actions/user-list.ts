import type { ActionDefinition } from "@w6w/types";
import { MotionClient, V1 } from "../lib/client.ts";
import { cursorParam, pageOutput, workspaceIdParam } from "../lib/params.ts";

/**
 * `GET /v1/users` — members of a workspace or a team.
 *
 * The only way to turn a person into the `assigneeId` every task endpoint wants:
 * Motion assigns by user id, never by email address, and a user id appears
 * nowhere in the Motion UI.
 *
 * `teamId` and `workspaceId` are both optional and both narrow the result; a
 * workspace's `teamId` is on the workspace object returned by List Workspaces.
 */
interface Input {
  workspaceId?: string;
  teamId?: string;
  cursor?: string;
}

const userList: ActionDefinition<Input> = {
  key: "user-list",
  type: "search",
  resource: "user",
  title: "List Users",
  description:
    "List users in a workspace or team. The source of the user id that task assignment needs — " +
    "Motion never accepts an email address as an assignee.",
  params: [
    workspaceIdParam(false, "Narrow to one workspace's members."),
    {
      key: "teamId",
      label: "Team",
      type: "string",
      hint: "Narrow to one team's members. A workspace's `teamId` is on the workspace object.",
    },
    cursorParam,
  ],
  output: [
    { key: "items", type: "array", label: "Users — each { id, name, email }" },
    ...pageOutput,
  ],

  execute(input, ctx) {
    return new MotionClient(ctx).page(`${V1}/users`, "users", {
      query: {
        workspaceId: input.workspaceId,
        teamId: input.teamId,
        cursor: input.cursor,
      },
    });
  },
};

export default userList;
