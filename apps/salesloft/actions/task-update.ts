import type { ActionDefinition } from "@w6w/types";
import { compact, SalesloftClient } from "../lib/client.ts";

interface Input {
  id: number;
  subject?: string;
  currentState?: "completed";
  dueDate?: string;
  remindAt?: string;
  description?: string;
  isLogged?: boolean;
}

/**
 * PUT /v2/tasks/:id — update a task. `current_state` only accepts
 * `completed` here (there is no documented way to un-complete a task via
 * update). Confirmed against developers.salesloft.com/docs/api/tasks-update.
 */
const taskUpdate: ActionDefinition<Input> = {
  key: "task-update",
  type: "perform",
  resource: "task",
  title: "Update Task",
  description: "Update a task — commonly used to mark it completed.",
  idempotent: true,
  params: [
    { key: "id", label: "Task ID", type: "number", required: true },
    { key: "subject", label: "Subject", type: "string" },
    {
      key: "currentState",
      label: "Current state",
      type: "select",
      options: [{ value: "completed", label: "Completed" }],
    },
    { key: "dueDate", label: "Due date", type: "date", hint: "ISO-8601 date." },
    { key: "remindAt", label: "Remind at", type: "datetime", hint: "ISO-8601 datetime." },
    { key: "description", label: "Description", type: "text" },
    {
      key: "isLogged",
      label: "Log only",
      type: "boolean",
      advanced: true,
      hint: "Flags the task as logged only, without otherwise changing its state.",
    },
  ],
  output: [{ key: "data", type: "object", label: "Task" }],

  async execute(input, ctx) {
    const client = new SalesloftClient(ctx);
    return await client.request(`/tasks/${input.id}`, {
      method: "PUT",
      body: compact({
        subject: input.subject,
        current_state: input.currentState,
        due_date: input.dueDate,
        remind_at: input.remindAt,
        description: input.description,
        is_logged: input.isLogged,
      }),
    });
  },
};

export default taskUpdate;
