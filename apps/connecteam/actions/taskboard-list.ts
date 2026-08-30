import type { ActionDefinition } from "@w6w/types";
import { ConnecteamClient } from "../lib/client.ts";

/** `GET /tasks/v1/taskboards` — the account's task boards. No filters, no pagination. */
interface Output {
  taskBoards: unknown[];
}

const taskboardList: ActionDefinition<Record<string, never>, Output> = {
  key: "taskboard-list",
  type: "read",
  resource: "task-board",
  title: "List Task Boards",
  description: "List the account's task boards.",
  params: [],
  output: [
    { key: "taskBoards", type: "array", label: "Task boards" },
  ],

  execute(_input, ctx) {
    return new ConnecteamClient(ctx).data<Output>("/tasks/v1/taskboards");
  },
};

export default taskboardList;
