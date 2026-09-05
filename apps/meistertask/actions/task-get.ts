import type { ActionDefinition } from "@w6w/types";
import { MeisterTaskClient } from "../lib/client.ts";

/** `GET /tasks/:id` — one task's full record. */
interface Input {
  id: number;
}

const taskGet: ActionDefinition<Input> = {
  key: "task-get",
  type: "read",
  resource: "task",
  title: "Get Task",
  description: "Fetch one task by ID.",
  params: [{ key: "id", label: "Task ID", type: "number", required: true }],
  output: [
    { key: "id", type: "number", label: "Task ID" },
    { key: "token", type: "string", label: "Task token" },
    { key: "name", type: "string", label: "Name" },
    { key: "notes", type: "string", label: "Description" },
    { key: "status", type: "number", label: "Status" },
    { key: "section_id", type: "number", label: "Section ID" },
    { key: "section_name", type: "string", label: "Section name" },
    { key: "project_id", type: "number", label: "Project ID" },
    { key: "assigned_to_id", type: "number", label: "Assignee person ID" },
    { key: "tracked_time", type: "number", label: "Tracked time (seconds)" },
    { key: "due", type: "string", label: "Due date/time" },
  ],

  execute(input, ctx) {
    return new MeisterTaskClient(ctx).request(`/tasks/${input.id}`);
  },
};

export default taskGet;
