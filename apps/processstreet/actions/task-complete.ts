import type { ActionDefinition } from "@w6w/types";
import { compact, ProcessStreetClient } from "../lib/client.ts";

interface Input {
  workflowRunId: string;
  taskId: string;
  dueDate?: string;
}

/**
 * `PUT /workflow-runs/{workflowRunId}/tasks/{taskId}` with `{ status: "Completed" }`. Answers
 * `204 No Content` on success. The spec documents `PUT` as idempotent ("calling them twice with
 * the same body is equivalent to calling once").
 */
interface Output {
  completed: boolean;
}

const taskComplete: ActionDefinition<Input, Output> = {
  key: "task-complete",
  type: "perform",
  resource: "task",
  title: "Complete Task",
  description: "Mark a task as completed.",
  idempotent: true,
  params: [
    { key: "workflowRunId", label: "Workflow Run ID", type: "string", required: true },
    { key: "taskId", label: "Task ID", type: "string", required: true },
    { key: "dueDate", label: "Due date", type: "datetime", advanced: true },
  ],
  output: [{ key: "completed", type: "boolean", label: "Completed" }],

  async execute(input, ctx) {
    await new ProcessStreetClient(ctx).request(
      `/workflow-runs/${encodeURIComponent(input.workflowRunId)}/tasks/${
        encodeURIComponent(input.taskId)
      }`,
      { method: "PUT", body: compact({ status: "Completed", dueDate: input.dueDate }) },
    );
    return { completed: true };
  },
};

export default taskComplete;
