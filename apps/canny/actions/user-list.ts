import type { ActionDefinition } from "@w6w/types";
import { v2 } from "../lib/client.ts";
import { cursorLimitParams } from "../lib/params.ts";

/**
 * `POST /v2/users/list` — list the end-users in the workspace.
 *
 * Canny's own "Returns" prose says "an array of users", but the reference's
 * own example response — and this action's shape — is the same cursor
 * envelope every other v2 list endpoint uses: `{users, hasNextPage, cursor}`.
 */
interface Input {
  limit?: number;
  cursor?: string;
}

const userList: ActionDefinition<Input> = {
  key: "user-list",
  type: "search",
  resource: "user",
  title: "List Users",
  description: "List the end-users within your workspace.",
  params: cursorLimitParams(10, 100),
  output: [
    { key: "users", type: "array", label: "Users" },
    { key: "hasNextPage", type: "boolean", label: "More users beyond this page" },
    { key: "cursor", type: "string", label: "Cursor for the next page" },
  ],

  execute(input, ctx) {
    return v2(ctx).post("/users/list", {
      limit: input.limit,
      cursor: input.cursor,
    });
  },
};

export default userList;
