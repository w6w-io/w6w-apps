import type { ActionDefinition } from "@w6w/types";
import { BasecampClient } from "../lib/client.ts";

/**
 * `GET /todos/{todoId}.json` — one to-do.
 *
 * A flat route: the to-do is addressed by its own id and Basecamp derives the
 * project server-side, so no project id is needed.
 */
interface Input {
  todoId: string;
}

const todoGet: ActionDefinition<Input> = {
  key: "todo-get",
  type: "read",
  resource: "todo",
  title: "Get To-do",
  description: "Fetch one to-do by its id. No project id is needed — Basecamp derives it.",
  params: [{ key: "todoId", label: "To-do ID", type: "string", required: true }],
  output: [
    { key: "id", type: "number", label: "To-do id" },
    { key: "completed", type: "boolean", label: "Whether it is done" },
  ],

  execute(input, ctx) {
    return new BasecampClient(ctx).request(`/todos/${encodeURIComponent(input.todoId)}.json`);
  },
};

export default todoGet;
