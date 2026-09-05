import type { ActionDefinition } from "@w6w/types";
import { OntraportClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `GET /1/Task` — every field of one task. */
interface Input {
  id: string;
}

const taskGet: ActionDefinition<Input> = {
  key: "task-get",
  type: "read",
  resource: "task",
  title: "Get Task",
  description: "Fetch all information for a single task by ID.",
  params: [idParam],
  output: [{ key: "data", type: "object", label: "The task" }],

  execute(input, ctx) {
    return new OntraportClient(ctx).data("/Task", { query: { id: input.id } });
  },
};

export default taskGet;
