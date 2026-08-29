import type { ActionDefinition } from "@w6w/types";
import { compact, SalesloftClient } from "../lib/client.ts";

interface Input {
  subject: string;
  personId?: number;
  userId?: number;
  taskType?: "call" | "email" | "general";
  dueDate?: string;
  remindAt?: string;
  description?: string;
  idempotencyKey?: string;
}

/**
 * POST /v2/tasks — create a task. `task_type` is documented as one of
 * call/email/general. Confirmed against
 * developers.salesloft.com/docs/api/tasks-create.
 */
const taskCreate: ActionDefinition<Input> = {
  key: "task-create",
  type: "perform",
  resource: "task",
  title: "Create Task",
  description: "Create a task for a person.",
  idempotent: false,
  params: [
    { key: "subject", label: "Subject", type: "string", required: true },
    { key: "personId", label: "Person ID", type: "number", hint: "The person to be contacted." },
    { key: "userId", label: "User ID", type: "number", hint: "The user the task is assigned to." },
    {
      key: "taskType",
      label: "Task type",
      type: "select",
      options: [
        { value: "call", label: "Call" },
        { value: "email", label: "Email" },
        { value: "general", label: "General" },
      ],
    },
    { key: "dueDate", label: "Due date", type: "date", hint: "ISO-8601 date." },
    { key: "remindAt", label: "Remind at", type: "datetime", hint: "ISO-8601 datetime." },
    { key: "description", label: "Description", type: "text" },
    {
      key: "idempotencyKey",
      label: "Idempotency key",
      type: "string",
      advanced: true,
      hint: "Prevents duplicate task creation on retry.",
    },
  ],
  output: [{ key: "data", type: "object", label: "Task" }],

  async execute(input, ctx) {
    const client = new SalesloftClient(ctx);
    return await client.request("/tasks", {
      method: "POST",
      body: compact({
        subject: input.subject,
        person_id: input.personId,
        user_id: input.userId,
        task_type: input.taskType,
        due_date: input.dueDate,
        remind_at: input.remindAt,
        description: input.description,
        idempotency_key: input.idempotencyKey,
      }),
    });
  },
};

export default taskCreate;
