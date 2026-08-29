import type { ActionDefinition } from "@w6w/types";
import { v2 } from "../lib/client.ts";
import { boardIdParam, cursorLimitParams } from "../lib/params.ts";

/**
 * `POST /v2/status_changes/list` — the feed of status changes across a board,
 * or the whole workspace. Useful for reacting to the team's triage activity
 * as a whole rather than watching one post at a time.
 */
interface Input {
  boardID?: string;
  limit?: number;
  cursor?: string;
}

const statusChangeList: ActionDefinition<Input> = {
  key: "status-change-list",
  type: "search",
  resource: "status-change",
  title: "List Status Changes",
  description: "List the feed of post status changes across a board or the workspace.",
  params: [boardIdParam(false), ...cursorLimitParams(10, 100)],
  output: [
    { key: "items", type: "array", label: "Status changes" },
    { key: "hasNextPage", type: "boolean", label: "More status changes beyond this page" },
    { key: "cursor", type: "string", label: "Cursor for the next page" },
  ],

  execute(input, ctx) {
    return v2(ctx).post("/status_changes/list", {
      boardID: input.boardID,
      limit: input.limit,
      cursor: input.cursor,
    });
  },
};

export default statusChangeList;
