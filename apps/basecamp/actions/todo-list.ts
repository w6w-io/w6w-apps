import type { ActionDefinition } from "@w6w/types";
import { BasecampClient } from "../lib/client.ts";

/**
 * `GET /todolists/{todolistId}/todos.json` — the to-dos in one list.
 *
 * **Completed to-dos are excluded by default.** Basecamp returns only open ones
 * unless `completed=true` is passed, and that flag *replaces* the set rather
 * than adding to it — there is no "both" — so a workflow reconciling a list has
 * to make two calls.
 */
interface Input {
  todolistId: string;
  completed?: boolean;
  status?: string;
  page?: number;
}

const todoList: ActionDefinition<Input> = {
  key: "todo-list",
  type: "search",
  resource: "todo",
  title: "List To-dos",
  description:
    "List a to-do list's to-dos. Open ones by default — asking for completed ones returns those " +
    "instead, not as well.",
  params: [
    {
      key: "todolistId",
      label: "To-do list ID",
      type: "string",
      required: true,
      hint: "From a project's to-do set. A project's `dock` names the to-do set.",
    },
    {
      key: "completed",
      label: "Completed only",
      type: "boolean",
      hint: "Returns completed to-dos *instead of* open ones. Two calls are needed for both.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "archived", label: "Archived" },
        { value: "trashed", label: "Trashed" },
      ],
    },
    { key: "page", label: "Page", type: "number", validation: { integer: true, min: 1 } },
  ],
  output: [{ key: "[]", type: "array", label: "To-dos" }],

  execute(input, ctx) {
    return new BasecampClient(ctx).request(
      `/todolists/${encodeURIComponent(input.todolistId)}/todos.json`,
      {
        query: {
          completed: input.completed === undefined ? undefined : String(input.completed),
          status: input.status,
          page: input.page,
        },
      },
    );
  },
};

export default todoList;
