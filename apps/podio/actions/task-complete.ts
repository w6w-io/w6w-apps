import type { ActionDefinition } from "@w6w/types";
import { encodeSegment, flag, PodioClient } from "../lib/client.ts";
import { writeSwitchParams } from "../lib/params.ts";

/**
 * `POST /task/{task_id}/complete` — "Mark the given task as completed."
 *
 * Idempotent: a task that is already complete stays complete, and the end state
 * of two calls is the end state of one.
 *
 * The response is `{recurring_task_id}` and it is worth reading rather than
 * discarding. Podio's tasks can recur, and completing one instance of a
 * recurring task *creates the next one* — so a workflow that completes tasks in
 * a loop and does not notice this id will keep finding a new open task and keep
 * completing it. The field is empty for a non-recurring task, which is how the
 * two cases are told apart.
 */
interface Input {
  taskId: string;
  hook?: boolean;
  silent?: boolean;
}

const taskComplete: ActionDefinition<Input> = {
  key: "task-complete",
  type: "perform",
  resource: "task",
  title: "Complete Task",
  description: "Mark a task complete. If the task recurs, Podio creates the next occurrence and " +
    "returns its id — check that field before completing tasks in a loop.",
  idempotent: true,
  params: [
    {
      key: "taskId",
      label: "Task ID",
      type: "string",
      required: true,
      hint: "Numeric task_id.",
    },
    ...writeSwitchParams(),
  ],
  output: [
    {
      key: "recurringTaskId",
      type: "number",
      label: "Next occurrence's task id, if this task recurs",
    },
  ],

  async execute(input, ctx) {
    const body = await new PodioClient(ctx).json<{ recurring_task_id?: number }>(
      `/task/${encodeSegment(input.taskId)}/complete`,
      {
        method: "POST",
        query: { hook: flag(input.hook), silent: flag(input.silent) },
      },
    );
    return { recurringTaskId: body?.recurring_task_id };
  },
};

export default taskComplete;
