import type { ActionDefinition } from "@w6w/types";
import { boxKeyParam } from "../lib/params.ts";
import { encodeId, StreakClient } from "../lib/client.ts";

/**
 * `GET /boxes/{boxKey}/tasks` — every task on a box, wrapped as
 * `{"results": [...]}` (see `lib/client.ts` for why this app doesn't assume
 * one list envelope).
 */
interface Input {
  boxKey: string;
}

interface TasksResponse {
  results?: unknown[];
}

const taskList: ActionDefinition<Input> = {
  key: "task-list",
  type: "search",
  resource: "task",
  title: "List Tasks On Box",
  description: "List every task on a box.",
  params: [boxKeyParam],
  output: [{ key: "results", type: "array", label: "Tasks" }],

  async execute(input, ctx) {
    const body = await new StreakClient(ctx).get<TasksResponse>(
      `/boxes/${encodeId(input.boxKey)}/tasks`,
    );
    return { results: body?.results ?? [] };
  },
};

export default taskList;
