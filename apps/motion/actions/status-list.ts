import type { ActionDefinition } from "@w6w/types";
import { MotionClient, V1 } from "../lib/client.ts";
import { workspaceIdParam } from "../lib/params.ts";

/**
 * `GET /v1/statuses` — the statuses defined for a workspace.
 *
 * Two things make this worth calling before any write:
 *
 *  - **Task status is set by NAME, not by id.** `status` on create/update is a
 *    string matched against these names, so this is where a valid value comes
 *    from.
 *  - **`isResolvedStatus` marks the terminating statuses** and
 *    `isDefaultStatus` the one a task lands in when no status is given. Both are
 *    per-workspace, and neither is guessable from the name.
 *
 * ## Bare array, no envelope, no cursor
 *
 * Unlike the eight paginated collections, this endpoint answers a **plain JSON
 * array** — no `meta`, no `nextCursor`, no page size. It is wrapped as `items`
 * here so every list-shaped action in this app returns the same key.
 */
interface Input {
  workspaceId?: string;
}

const statusList: ActionDefinition<Input> = {
  key: "status-list",
  type: "read",
  resource: "status",
  title: "List Statuses",
  description:
    "List a workspace's statuses. Task status is set by NAME, so this is where a valid value " +
    "comes from; isDefaultStatus and isResolvedStatus are per-workspace facts.",
  params: [
    workspaceIdParam(
      false,
      "Leave empty to let Motion choose. A workspace's statuses are also carried inline on each " +
        "workspace returned by List Workspaces.",
    ),
  ],
  output: [
    {
      key: "items",
      type: "array",
      label: "Statuses — each { name, isDefaultStatus, isResolvedStatus }",
    },
  ],

  async execute(input, ctx) {
    // A bare array, not the `{meta, …}` envelope the paginated endpoints use.
    const items = await new MotionClient(ctx).json<unknown[]>(`${V1}/statuses`, {
      query: { workspaceId: input.workspaceId },
    });
    return { items: items ?? [] };
  },
};

export default statusList;
