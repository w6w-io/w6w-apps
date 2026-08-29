import type { ActionDefinition } from "@w6w/types";
import { ApolloClient, compact } from "../lib/client.ts";
import { taskPriorityOptions, taskStatusOptions, taskTypeOptions } from "../lib/params.ts";

/** `POST /tasks` — create a new task for a contact. All five fields are required by Apollo. */
interface Input {
  user_id: string;
  contact_id: string;
  type: string;
  status: string;
  due_at: string;
  priority?: string;
  title?: string;
  note?: string;
}

const taskCreate: ActionDefinition<Input> = {
  key: "task-create",
  type: "perform",
  resource: "task",
  title: "Create Task",
  description: "Create a new task assigned to a contact.",
  idempotent: false,
  params: [
    {
      key: "user_id",
      label: "Owner (Apollo user ID)",
      type: "string",
      required: true,
      hint: "The task owner. From `user-list`.",
    },
    { key: "contact_id", label: "Contact", type: "string", required: true },
    { key: "type", label: "Task type", type: "select", required: true, options: taskTypeOptions },
    {
      key: "status",
      label: "Status",
      type: "select",
      required: true,
      options: taskStatusOptions,
      hint: "Use `scheduled` for a future task.",
    },
    {
      key: "due_at",
      label: "Due at",
      type: "datetime",
      required: true,
    },
    { key: "priority", label: "Priority", type: "select", options: taskPriorityOptions },
    {
      key: "title",
      label: "Title",
      type: "string",
      hint: "Auto-generated from the task type if left empty.",
    },
    {
      key: "note",
      label: "Note",
      type: "text",
      hint: "Recommended when Task type is `action_item`.",
    },
  ],
  output: [{ key: "task", type: "object", label: "The created task" }],

  async execute(input, ctx) {
    const body = await new ApolloClient(ctx).post<{ task?: unknown }>("/tasks", {
      body: compact({
        user_id: input.user_id,
        contact_id: input.contact_id,
        type: input.type,
        status: input.status,
        due_at: input.due_at,
        priority: input.priority,
        title: input.title,
        note: input.note,
      }),
    });
    return { task: body.task ?? null };
  },
};

export default taskCreate;
