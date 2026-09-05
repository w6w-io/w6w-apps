import type { ActionDefinition } from "@w6w/types";
import { MeisterTaskClient } from "../lib/client.ts";

/**
 * `POST /tasks/:task_id/subtasks` — create a subtask under a parent task.
 *
 * `sectionId` defaults to the parent task's own section when omitted, per
 * the vendor's own docs.
 */
interface Input {
  taskId: number;
  name: string;
  notes?: string;
  assignedToId?: number;
  due?: string;
  status?: number;
  sectionId?: number;
}

const subtaskCreate: ActionDefinition<Input> = {
  key: "subtask-create",
  type: "perform",
  resource: "task",
  title: "Create Subtask",
  description: "Create a subtask under a parent task.",
  idempotent: false,
  params: [
    { key: "taskId", label: "Parent Task ID", type: "number", required: true },
    { key: "name", label: "Name", type: "string", required: true },
    { key: "notes", label: "Description", type: "text" },
    { key: "assignedToId", label: "Assign to (person ID)", type: "number" },
    { key: "due", label: "Due date/time", type: "datetime" },
    {
      key: "sectionId",
      label: "Section ID",
      type: "number",
      hint: "Defaults to the parent task's own section.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: 1, label: "Open (default)" },
        { value: 2, label: "Completed" },
        { value: 8, label: "Trashed" },
        { value: 18, label: "Completed & archived" },
      ],
    },
  ],
  output: [
    { key: "id", type: "number", label: "Subtask ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "number", label: "Status" },
  ],

  execute(input, ctx) {
    return new MeisterTaskClient(ctx).request(`/tasks/${input.taskId}/subtasks`, {
      method: "POST",
      body: {
        name: input.name,
        notes: input.notes,
        assigned_to_id: input.assignedToId,
        due: input.due,
        section_id: input.sectionId,
        status: input.status,
      },
    });
  },
};

export default subtaskCreate;
