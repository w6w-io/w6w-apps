import type { ActionDefinition } from "@w6w/types";
import { HubstaffClient } from "../lib/client.ts";
import { taskIdParam } from "../lib/params.ts";

/**
 * `GET /v2/tasks/{task_id}` — one task.
 *
 * Returns `{"task": {...Task}}`, the same schema `task-list` returns. This is
 * where `lock_version` comes from: `PUT /v2/tasks/{task_id}` — which this build
 * does not cover — requires passing it back, so an optimistic update needs this
 * read first.
 */
interface Input {
  task_id: number;
}

const action: ActionDefinition<Input> = {
  key: "task-get",
  type: "read",
  resource: "task",
  title: "Get Task",
  description: "Get one task by ID (GET /v2/tasks/{task_id}).",
  params: [taskIdParam],
  output: [{ key: "task", type: "object", label: "Task" }],

  execute(input, ctx) {
    return new HubstaffClient(ctx).request(`/tasks/${input.task_id}`);
  },
};

export default action;
