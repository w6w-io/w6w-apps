import type { ActionDefinition } from "@w6w/types";
import { ApolloClient, compact } from "../lib/client.ts";
import { encodeId } from "../lib/ids.ts";

/** `POST /tasks/{id}/skip` — mark a scheduled task skipped. */
interface Input {
  id: string;
  note?: string;
  on_task_page?: boolean;
}

const taskSkip: ActionDefinition<Input> = {
  key: "task-skip",
  type: "perform",
  resource: "task",
  title: "Skip Task",
  description: "Mark a scheduled task as skipped.",
  // Skipping an already-skipped task converges to the same end state.
  idempotent: true,
  params: [
    { key: "id", label: "Task", type: "string", required: true },
    { key: "note", label: "Note", type: "text" },
    {
      key: "on_task_page",
      label: "Reindex synchronously",
      type: "boolean",
      advanced: true,
      hint: "Reflect the change immediately in search results.",
    },
  ],
  output: [{ key: "task", type: "object", label: "The skipped task" }],

  async execute(input, ctx) {
    const body = await new ApolloClient(ctx).post<{ task?: unknown }>(
      `/tasks/${encodeId(input.id)}/skip`,
      { body: compact({ note: input.note, on_task_page: input.on_task_page }) },
    );
    return { task: body.task ?? null };
  },
};

export default taskSkip;
