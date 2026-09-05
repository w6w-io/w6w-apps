import type { ActionDefinition } from "@w6w/types";
import { MeisterTaskClient } from "../lib/client.ts";

/**
 * `PUT /tasks/:id` — update a task's name, notes, assignee, due date,
 * status, or move it to another section (this is also how a task is
 * dragged from one Kanban column to another via the API).
 */
interface Input {
  id: number;
  name?: string;
  notes?: string;
  assignedToId?: number;
  due?: string;
  sectionId?: number;
  status?: number;
}

const taskUpdate: ActionDefinition<Input> = {
  key: "task-update",
  type: "perform",
  resource: "task",
  title: "Update Task",
  description: "Update a task's name, description, assignee, due date, status or section — " +
    "moving it between sections is how a task changes Kanban column.",
  idempotent: true,
  params: [
    { key: "id", label: "Task ID", type: "number", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "notes", label: "Description", type: "text" },
    { key: "assignedToId", label: "Assign to (person ID)", type: "number" },
    { key: "due", label: "Due date/time", type: "datetime" },
    { key: "sectionId", label: "Move to section ID", type: "number" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: 1, label: "Open" },
        { value: 2, label: "Completed" },
        { value: 8, label: "Trashed" },
        { value: 18, label: "Completed & archived" },
      ],
    },
  ],
  output: [
    { key: "id", type: "number", label: "Task ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "number", label: "Status" },
    { key: "section_id", type: "number", label: "Section ID" },
  ],

  execute(input, ctx) {
    return new MeisterTaskClient(ctx).request(`/tasks/${input.id}`, {
      method: "PUT",
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

export default taskUpdate;
