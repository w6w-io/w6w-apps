import type { ActionDefinition } from "@w6w/types";
import { ApolloClient, compact } from "../lib/client.ts";
import { encodeId } from "../lib/ids.ts";

/** `POST /tasks/{id}/complete` — mark a scheduled task done. */
interface Input {
  id: string;
  note?: string;
}

const taskComplete: ActionDefinition<Input> = {
  key: "task-complete",
  type: "perform",
  resource: "task",
  title: "Complete Task",
  description: "Mark a scheduled task as completed.",
  // Completing an already-completed task converges to the same end state.
  idempotent: true,
  params: [
    { key: "id", label: "Task", type: "string", required: true },
    { key: "note", label: "Note", type: "text" },
  ],
  output: [{ key: "task", type: "object", label: "The completed task" }],

  async execute(input, ctx) {
    const body = await new ApolloClient(ctx).post<{ task?: unknown }>(
      `/tasks/${encodeId(input.id)}/complete`,
      { body: compact({ note: input.note }) },
    );
    return { task: body.task ?? null };
  },
};

export default taskComplete;
