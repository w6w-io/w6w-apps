import type { ActionDefinition } from "@w6w/types";
import { ClioClient } from "../lib/client.ts";
import { fieldsParam, idParam } from "../lib/params.ts";

/** `GET /tasks/{id}.json` */
interface Input {
  id: number;
  fields?: string;
}

const taskGet: ActionDefinition<Input> = {
  key: "task-get",
  type: "read",
  resource: "task",
  title: "Get Task",
  description: "Fetch one task by id.",
  params: [
    idParam("Task ID"),
    fieldsParam(
      "id,etag,name,description,status,priority,due_at,complete,assignee{id,name}," +
        "matter{id,display_number}",
    ),
  ],
  output: [{ key: "data", type: "object", label: "The task" }],

  execute(input, ctx) {
    return new ClioClient(ctx).data(`/tasks/${input.id}.json`, {
      query: { fields: input.fields },
    });
  },
};

export default taskGet;
