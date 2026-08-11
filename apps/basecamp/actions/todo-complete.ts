import type { ActionDefinition } from "@w6w/types";
import { BasecampClient } from "../lib/client.ts";

/**
 * `POST /todos/{todoId}/completion.json` — mark a to-do done, or undo it.
 *
 * Completion is modelled as a **sub-resource**, not a field: you create it to
 * complete the to-do and delete it to reopen. That is why this is one action
 * with a direction rather than an update to `completed`.
 *
 * Both directions answer `204` with no body.
 *
 * Idempotent: completing an already-complete to-do leaves it complete.
 */
interface Input {
  todoId: string;
  completed?: boolean;
}

const todoComplete: ActionDefinition<Input> = {
  key: "todo-complete",
  type: "perform",
  resource: "todo",
  title: "Complete To-do",
  description:
    "Mark a to-do as done, or reopen it. Basecamp models completion as a sub-resource rather " +
    "than a field.",
  idempotent: true,
  params: [
    { key: "todoId", label: "To-do ID", type: "string", required: true },
    {
      key: "completed",
      label: "Completed",
      type: "boolean",
      default: true,
      hint: "On (the default) completes it. Off reopens it.",
    },
  ],
  output: [],

  execute(input, ctx) {
    const complete = input.completed !== false;
    return new BasecampClient(ctx).request(
      `/todos/${encodeURIComponent(input.todoId)}/completion.json`,
      { method: complete ? "POST" : "DELETE" },
    );
  },
};

export default todoComplete;
