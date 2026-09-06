import type { ActionDefinition } from "@w6w/types";
import { compact, ProcessStreetClient } from "../lib/client.ts";

interface Input {
  workflowRunId: string;
  taskId: string;
  dueDate?: string;
}

/**
 * `PUT /workflow-runs/{workflowRunId}/tasks/{taskId}` with `{ status: "NotCompleted" }` — undoes
 * `task-complete`. Also the only way to CLEAR a due date per the spec's own worked example
 * ("Clear due date": `{ status: "NotCompleted" }` with no `dueDate` key).
 */
interface Output {
  completed: boolean;
}

const taskUncomplete: ActionDefinition<Input, Output> = {
  key: "task-uncomplete",
  type: "perform",
  resource: "task",
  title: "Uncomplete Task",
  description: "Mark a task as not completed (undo Complete Task).",
  idempotent: true,
  params: [
    { key: "workflowRunId", label: "Workflow Run ID", type: "string", required: true },
    { key: "taskId", label: "Task ID", type: "string", required: true },
    {
      key: "dueDate",
      label: "Due date",
      type: "datetime",
      advanced: true,
      hint: "Leave blank to clear any existing due date.",
    },
  ],
  output: [{ key: "completed", type: "boolean", label: "Completed" }],

  async execute(input, ctx) {
    await new ProcessStreetClient(ctx).request(
      `/workflow-runs/${encodeURIComponent(input.workflowRunId)}/tasks/${
        encodeURIComponent(input.taskId)
      }`,
      { method: "PUT", body: compact({ status: "NotCompleted", dueDate: input.dueDate }) },
    );
    return { completed: false };
  },
};

export default taskUncomplete;
