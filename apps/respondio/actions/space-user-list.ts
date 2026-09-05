import type { ActionDefinition } from "@w6w/types";
import { compact, RespondioClient } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/**
 * `GET /space/user` — `SpaceClient.listUsers` in the official SDK. Also the
 * app's own credential-liveness probe (`auth/api-token.ts`), so this action
 * is safe to invoke with `{}`.
 */
interface Input {
  limit?: number;
  cursorId?: number;
}

const spaceUserList: ActionDefinition<Input> = {
  key: "space-user-list",
  type: "read",
  resource: "space",
  title: "List Workspace Users",
  description: "List the users (agents/managers/owners) in this workspace.",
  params: [...paginationParams()],
  output: [
    { key: "items", type: "array", label: "Users" },
    { key: "pagination", type: "object", label: "Pagination cursor" },
  ],

  execute(input, ctx) {
    return new RespondioClient(ctx).get(
      "/space/user",
      compact({ limit: input.limit, cursorId: input.cursorId }),
    );
  },
};

export default spaceUserList;
