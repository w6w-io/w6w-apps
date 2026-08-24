import type { ActionDefinition } from "@w6w/types";
import { ClioClient, compact } from "../lib/client.ts";
import { fieldsParam, idParam, taskPriorityOptions, taskStatusOptions } from "../lib/params.ts";

/** `PATCH /tasks/{id}.json` */
interface Input {
  id: number;
  name?: string;
  description?: string;
  status?: string;
  priority?: string;
  dueAt?: string;
  fields?: string;
}

const taskUpdate: ActionDefinition<Input> = {
  key: "task-update",
  type: "perform",
  resource: "task",
  title: "Update Task",
  description: "Update fields on an existing task. Only the fields you set are changed.",
  idempotent: true,
  params: [
    idParam("Task ID"),
    { key: "name", label: "Name", type: "string" },
    { key: "description", label: "Description", type: "text" },
    { key: "status", label: "Status", type: "select", options: taskStatusOptions },
    { key: "priority", label: "Priority", type: "select", options: taskPriorityOptions },
    { key: "dueAt", label: "Due date", type: "date" },
    fieldsParam("id,etag,name,status,due_at,complete"),
  ],
  output: [{ key: "data", type: "object", label: "The updated task" }],

  execute(input, ctx) {
    return new ClioClient(ctx).data(`/tasks/${input.id}.json`, {
      method: "PATCH",
      query: { fields: input.fields },
      body: compact({
        name: input.name,
        description: input.description,
        status: input.status,
        priority: input.priority,
        due_at: input.dueAt,
      }),
    });
  },
};

export default taskUpdate;
