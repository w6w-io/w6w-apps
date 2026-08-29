import type { ActionDefinition } from "@w6w/types";
import { ApolloClient, compact } from "../lib/client.ts";
import { encodeId } from "../lib/ids.ts";
import { taskPriorityOptions, taskTypeOptions } from "../lib/params.ts";

/**
 * `PATCH /tasks/{id}` — update a task. Several fields "only apply to tasks with a
 * `scheduled` status" per Apollo's own docs — a completed/skipped task ignores most of
 * these. Use `task-complete`/`task-skip` to change status.
 */
interface Input {
  id: string;
  contact_id?: string;
  type?: string;
  priority?: string;
  due_at?: string;
  title?: string;
  note?: string;
  call_script?: string;
}

const taskUpdate: ActionDefinition<Input> = {
  key: "task-update",
  type: "perform",
  resource: "task",
  title: "Update Task",
  description: "Update a task. Most fields only take effect while the task is `scheduled`.",
  // A PATCH that sets absolute field values converges to the same end state on retry.
  idempotent: true,
  params: [
    { key: "id", label: "Task", type: "string", required: true },
    { key: "contact_id", label: "Contact", type: "string" },
    { key: "type", label: "Task type", type: "select", options: taskTypeOptions },
    { key: "priority", label: "Priority", type: "select", options: taskPriorityOptions },
    { key: "due_at", label: "Due at", type: "datetime" },
    { key: "title", label: "Title", type: "string" },
    { key: "note", label: "Note", type: "text" },
    {
      key: "call_script",
      label: "Call script",
      type: "text",
      advanced: true,
      hint: "Only applies to `call` tasks.",
    },
  ],
  output: [{ key: "task", type: "object", label: "The updated task" }],

  async execute(input, ctx) {
    const body = await new ApolloClient(ctx).patch<{ task?: unknown }>(
      `/tasks/${encodeId(input.id)}`,
      {
        body: compact({
          contact_id: input.contact_id,
          type: input.type,
          priority: input.priority,
          due_at: input.due_at,
          title: input.title,
          note: input.note,
          call_script: input.call_script,
        }),
      },
    );
    return { task: body.task ?? null };
  },
};

export default taskUpdate;
