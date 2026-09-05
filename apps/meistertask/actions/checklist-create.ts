import type { ActionDefinition } from "@w6w/types";
import { MeisterTaskClient } from "../lib/client.ts";

/** `POST /tasks/:task_id/checklists` — add a checklist to a task. */
interface Input {
  taskId: number;
  name: string;
  sequence?: number;
}

const checklistCreate: ActionDefinition<Input> = {
  key: "checklist-create",
  type: "perform",
  resource: "checklist",
  title: "Create Checklist",
  description: "Create a checklist on a task.",
  idempotent: false,
  params: [
    { key: "taskId", label: "Task ID", type: "number", required: true },
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "sequence",
      label: "Sequence",
      type: "number",
      hint: "Sort order among the task's checklists.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Checklist ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "task_id", type: "number", label: "Task ID" },
    { key: "project_id", type: "number", label: "Project ID" },
  ],

  execute(input, ctx) {
    return new MeisterTaskClient(ctx).request(`/tasks/${input.taskId}/checklists`, {
      method: "POST",
      body: { name: input.name, sequence: input.sequence },
    });
  },
};

export default checklistCreate;
