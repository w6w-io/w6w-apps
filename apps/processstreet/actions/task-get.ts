import type { ActionDefinition } from "@w6w/types";
import { ProcessStreetClient } from "../lib/client.ts";

interface Input {
  workflowRunId: string;
  taskId: string;
}

interface Task {
  id: string;
  name: string;
  status: "NotCompleted" | "Completed";
  workflowRunId: string;
  hidden: boolean;
  stopped: boolean;
  dueDate?: string;
  completedDate?: string;
}

/** `GET /workflow-runs/{workflowRunId}/tasks/{taskId}` — a single task by id. */
interface Output {
  task: Task;
}

const taskGet: ActionDefinition<Input, Output> = {
  key: "task-get",
  type: "read",
  resource: "task",
  title: "Get Task",
  description: "Read a single task within a Workflow Run.",
  params: [
    { key: "workflowRunId", label: "Workflow Run ID", type: "string", required: true },
    { key: "taskId", label: "Task ID", type: "string", required: true },
  ],
  output: [{ key: "task", type: "object", label: "Task" }],

  async execute(input, ctx) {
    const { data } = await new ProcessStreetClient(ctx).request<Task>(
      `/workflow-runs/${encodeURIComponent(input.workflowRunId)}/tasks/${
        encodeURIComponent(input.taskId)
      }`,
    );
    return { task: data };
  },
};

export default taskGet;
