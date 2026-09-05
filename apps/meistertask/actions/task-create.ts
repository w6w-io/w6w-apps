import type { ActionDefinition } from "@w6w/types";
import { MeisterTaskClient } from "../lib/client.ts";

/**
 * `POST /sections/:section_id/tasks` — create a task in a section.
 *
 * The vendor's schema also accepts nested `label_ids`, `custom_fields` and
 * `checklists` arrays on this same call. `label_ids` is exposed here since
 * it is a plain array of numbers; `custom_fields` and `checklists` take
 * structured child objects the vendor's docs describe only in prose (no
 * schema for the child shape), so they are left out — attach labels via
 * `task-label-add` and checklists via `checklist-create` after the task
 * exists instead.
 */
interface Input {
  sectionId: number;
  name: string;
  notes?: string;
  assignedToId?: number;
  due?: string;
  status?: number;
  labelIds?: number[];
}

const taskCreate: ActionDefinition<Input> = {
  key: "task-create",
  type: "perform",
  resource: "task",
  title: "Create Task",
  description: "Create a task in a section.",
  idempotent: false,
  params: [
    { key: "sectionId", label: "Section ID", type: "number", required: true },
    { key: "name", label: "Name", type: "string", required: true },
    { key: "notes", label: "Description", type: "text" },
    { key: "assignedToId", label: "Assign to (person ID)", type: "number" },
    {
      key: "due",
      label: "Due date/time",
      type: "datetime",
      hint: "ISO 8601. MeisterTask distinguishes a bare date from a date+time.",
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
    {
      key: "labelIds",
      label: "Label IDs",
      type: "array",
      item: { type: "number" },
      hint: "Labels must already exist in the task's project — see label-create.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Task ID" },
    { key: "token", type: "string", label: "Task token" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "number", label: "Status" },
    { key: "section_id", type: "number", label: "Section ID" },
    { key: "project_id", type: "number", label: "Project ID" },
  ],

  execute(input, ctx) {
    return new MeisterTaskClient(ctx).request(`/sections/${input.sectionId}/tasks`, {
      method: "POST",
      body: {
        name: input.name,
        notes: input.notes,
        assigned_to_id: input.assignedToId,
        due: input.due,
        status: input.status,
        label_ids: input.labelIds,
      },
    });
  },
};

export default taskCreate;
