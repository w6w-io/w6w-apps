import type { ActionDefinition } from "@w6w/types";
import { ApifyClient, encodeId } from "../lib/client.ts";
import { taskIdParam } from "../lib/params.ts";

/**
 * `GET /v2/actor-tasks/{actorTaskId}` — one task's definition.
 *
 * The task object carries `actId` (which Actor it runs) and `options` (the
 * memory and timeout it runs with), but **not** its stored input — that lives
 * behind `GET /v2/actor-tasks/{id}/input`, which this app does not expose. See
 * the README's "Deliberately not covered" section for why.
 */
interface Input {
  taskId: string;
}

const taskGet: ActionDefinition<Input> = {
  key: "task-get",
  type: "read",
  resource: "task",
  title: "Get Task",
  description: "Fetch one Actor task's definition and run options.",
  params: [taskIdParam],
  output: [{ key: "data", type: "object", label: "The task" }],

  execute(input, ctx) {
    return new ApifyClient(ctx).data(`/actor-tasks/${encodeId(input.taskId)}`);
  },
};

export default taskGet;
