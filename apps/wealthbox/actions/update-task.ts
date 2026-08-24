import type { ActionDefinition } from "@w6w/types";
import { ADDITIONAL_PROPERTIES_PARAM, compact, WealthboxClient } from "../lib/client.ts";

interface Input {
  taskId: number;
  name: string;
  dueDate: string;
  complete?: boolean;
  category?: number;
  linkedTo?: unknown[];
  priority?: string;
  visibleTo?: string;
  assignedTo?: number;
  assignedToTeam?: number;
  description?: string;
  additionalProperties?: Record<string, unknown>;
}

/**
 * `PUT /v1/tasks/{id}` — update a Task (reassign, mark complete, change due
 * date, etc.).
 *
 * Unlike Contact's PUT (explicitly documented as a partial patch — "All
 * fields are optional; any fields not included in the request will not be
 * updated"), Wealthbox's own docs mark `name` and `due_date` **required** on
 * this endpoint, identically to Create. This app follows that literally
 * rather than assuming patch semantics: omitting them risks either a
 * rejected request or the field being reset, and there is no documented
 * statement that they are safe to leave out. Every other field is genuinely
 * optional and, per the same page, left alone when omitted.
 *
 * Idempotent: applying the same field values twice leaves the Task in the
 * same state, so a retry after a network failure is safe.
 */
const updateTask: ActionDefinition<Input> = {
  key: "update-task",
  type: "perform",
  resource: "task",
  title: "Update Task",
  description:
    "Update an existing Task. Wealthbox requires resending `name` and `due_date` on every " +
    "update — they are not optional here even though most other fields are.",
  idempotent: true,
  params: [
    { key: "taskId", label: "Task ID", type: "number", required: true },
    { key: "name", label: "Name", type: "string", required: true },
    { key: "dueDate", label: "Due date", type: "datetime", required: true },
    { key: "complete", label: "Complete", type: "boolean" },
    { key: "category", label: "Category ID", type: "number" },
    {
      key: "linkedTo",
      label: "Linked to",
      type: "json",
      hint: 'Array of `{"id": 1, "type": "Contact"}` — supported types: Contact, Project, ' +
        "Opportunity.",
    },
    {
      key: "priority",
      label: "Priority",
      type: "select",
      options: [
        { value: "Low", label: "Low" },
        { value: "Medium", label: "Medium" },
        { value: "High", label: "High" },
      ],
    },
    {
      key: "visibleTo",
      label: "Visible to",
      type: "string",
      hint: '"Everyone", "Private", or a user-group id.',
    },
    { key: "assignedTo", label: "Assigned to user ID", type: "number" },
    { key: "assignedToTeam", label: "Assigned to team ID", type: "number" },
    { key: "description", label: "Description", type: "text" },
    ADDITIONAL_PROPERTIES_PARAM,
  ],
  output: [{ key: "id", type: "number", label: "Task ID" }],

  execute(input, ctx) {
    const body = {
      ...compact({
        name: input.name,
        due_date: input.dueDate,
        complete: input.complete,
        category: input.category,
        linked_to: input.linkedTo,
        priority: input.priority,
        visible_to: input.visibleTo,
        assigned_to: input.assignedTo,
        assigned_to_team: input.assignedToTeam,
        description: input.description,
      }),
      ...(input.additionalProperties ?? {}),
    };
    return new WealthboxClient(ctx).request(`/tasks/${encodeURIComponent(input.taskId)}`, {
      method: "PUT",
      body,
    });
  },
};

export default updateTask;
