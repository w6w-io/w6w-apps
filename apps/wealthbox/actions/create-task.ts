import type { ActionDefinition } from "@w6w/types";
import { ADDITIONAL_PROPERTIES_PARAM, compact, WealthboxClient } from "../lib/client.ts";

interface Input {
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
 * `POST /v1/tasks` — create a Task, assigned to either a user (`assignedTo`)
 * or a team (`assignedToTeam`); dev.wealthbox.com documents these as two
 * separate operations sharing one endpoint and body shape.
 *
 * Not idempotent: Wealthbox mints a new task id per call with no idempotency
 * key on this endpoint, so a retry creates a duplicate.
 */
const createTask: ActionDefinition<Input> = {
  key: "create-task",
  type: "perform",
  resource: "task",
  title: "Create Task",
  description: "Create a Task, assigned to a user or a team.",
  idempotent: false,
  params: [
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
    {
      key: "assignedTo",
      label: "Assigned to user ID",
      type: "number",
      hint: "Mutually exclusive with Assigned to team ID.",
    },
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
    return new WealthboxClient(ctx).request("/tasks", { method: "POST", body });
  },
};

export default createTask;
