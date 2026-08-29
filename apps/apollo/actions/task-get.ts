import type { ActionDefinition } from "@w6w/types";
import { ApolloClient } from "../lib/client.ts";
import { encodeId } from "../lib/ids.ts";

/** `GET /tasks/{id}` — one task. */
interface Input {
  id: string;
}

const taskGet: ActionDefinition<Input> = {
  key: "task-get",
  type: "read",
  resource: "task",
  title: "Get Task",
  description: "Fetch one task by its Apollo ID.",
  params: [{ key: "id", label: "Task", type: "string", required: true }],
  output: [{ key: "task", type: "object", label: "The task" }],

  async execute(input, ctx) {
    const body = await new ApolloClient(ctx).get<{ task?: unknown }>(
      `/tasks/${encodeId(input.id)}`,
    );
    return { task: body.task ?? null };
  },
};

export default taskGet;
