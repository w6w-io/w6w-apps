import type { ActionDefinition } from "@w6w/types";
import { BasecampClient, compact, toIdList } from "../lib/client.ts";

/**
 * `POST /todolists/{todolistId}/todos.json` — add a to-do.
 *
 * `content` is the only required field — it is the to-do's title. `description`
 * is the longer body and is **rich text**: Basecamp stores and returns HTML
 * here, so a plain string arrives as a single paragraph and markup is preserved
 * rather than escaped.
 *
 * `assignee_ids` are numeric person ids from List People. There is no
 * assign-by-email anywhere in this API.
 *
 * `due_on` and `starts_on` are dates (`YYYY-MM-DD`), not timestamps — a to-do is
 * due on a day, not at an instant.
 *
 * Not idempotent: Basecamp has no idempotency key here, and a repeat adds a
 * second identical to-do to the list.
 */
interface Input {
  todolistId: string;
  content: string;
  description?: string;
  assigneeIds?: string;
  completionSubscriberIds?: string;
  notify?: boolean;
  dueOn?: string;
  startsOn?: string;
}

const todoCreate: ActionDefinition<Input> = {
  key: "todo-create",
  type: "perform",
  resource: "todo",
  title: "Create To-do",
  description: "Add a to-do to a list, optionally assigned and dated.",
  idempotent: false,
  params: [
    { key: "todolistId", label: "To-do list ID", type: "string", required: true },
    {
      key: "content",
      label: "Title",
      type: "string",
      required: true,
      hint: "The to-do itself. Basecamp calls this `content`.",
    },
    {
      key: "description",
      label: "Description",
      type: "text",
      hint: "Rich text — Basecamp stores HTML here, so markup is preserved rather than escaped.",
    },
    {
      key: "assigneeIds",
      label: "Assignee IDs",
      type: "string",
      hint: "Comma-separated person ids from List People. There is no assign-by-email.",
    },
    {
      key: "completionSubscriberIds",
      label: "Notify on completion",
      type: "string",
      hint: "Comma-separated person ids to notify when the to-do is completed.",
    },
    {
      key: "notify",
      label: "Notify assignees",
      type: "boolean",
      hint: "Tell the assignees about it now.",
    },
    {
      key: "dueOn",
      label: "Due on",
      type: "date",
      hint: "A date (YYYY-MM-DD), not a timestamp.",
    },
    { key: "startsOn", label: "Starts on", type: "date" },
  ],
  output: [{ key: "id", type: "number", label: "The created to-do's id" }],

  execute(input, ctx) {
    return new BasecampClient(ctx).request(
      `/todolists/${encodeURIComponent(input.todolistId)}/todos.json`,
      {
        method: "POST",
        body: compact({
          content: input.content,
          description: input.description,
          assignee_ids: toIdList(input.assigneeIds, "Assignee IDs"),
          completion_subscriber_ids: toIdList(
            input.completionSubscriberIds,
            "Notify on completion",
          ),
          notify: input.notify,
          due_on: input.dueOn,
          starts_on: input.startsOn,
        }),
      },
    );
  },
};

export default todoCreate;
