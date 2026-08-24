import type { ActionDefinition } from "@w6w/types";
import { ClioClient, compact, idRef } from "../lib/client.ts";
import { fieldsParam, refParam, taskPriorityOptions } from "../lib/params.ts";

/**
 * `POST /tasks.json` — required: `name`, `description`, `assignee`
 * (verified in the OpenAPI document's `Task` create schema). `assignee` is an
 * `{id, type}` pair where `type` is `"User"` or `"Contact"` — not a free
 * string, and capitalized, unlike the lowercase `assignee_type` the LIST
 * endpoint's own filter takes (see `task-list.ts`).
 */
interface Input {
  name: string;
  description: string;
  assigneeId: number;
  assigneeType: string;
  matterId?: number;
  dueAt?: string;
  priority?: string;
  fields?: string;
}

const taskCreate: ActionDefinition<Input> = {
  key: "task-create",
  type: "perform",
  resource: "task",
  title: "Create Task",
  description: "Create a new task assigned to a user or contact.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "description", label: "Description", type: "text", required: true },
    { ...refParam("assigneeId", "Assignee ID"), required: true },
    {
      key: "assigneeType",
      label: "Assignee type",
      type: "select",
      required: true,
      options: [{ value: "User", label: "User" }, { value: "Contact", label: "Contact" }],
    },
    refParam("matterId", "Matter ID"),
    { key: "dueAt", label: "Due date", type: "date" },
    { key: "priority", label: "Priority", type: "select", options: taskPriorityOptions },
    fieldsParam("id,etag,name,status,due_at"),
  ],
  output: [{ key: "data", type: "object", label: "The created task" }],

  execute(input, ctx) {
    return new ClioClient(ctx).data("/tasks.json", {
      method: "POST",
      query: { fields: input.fields },
      body: compact({
        name: input.name,
        description: input.description,
        assignee: { id: input.assigneeId, type: input.assigneeType },
        matter: idRef(input.matterId),
        due_at: input.dueAt,
        priority: input.priority,
      }),
    });
  },
};

export default taskCreate;
