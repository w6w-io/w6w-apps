import type { ActionDefinition } from "@w6w/types";
import { boxKeyParam } from "../lib/params.ts";
import { encodeId, StreakClient } from "../lib/client.ts";

/**
 * `POST /boxes/{boxKey}/tasks` — create a task on a box.
 *
 * The request body's own **required** field is named `key`, and its
 * description reads "Box key" — the exact same value already supplied in
 * the path. Confirmed against the vendor's own OpenAPI document, not a
 * guess: this really is what `create-a-task` declares, and sending the box
 * key only in the path (and omitting the body's `key`) is answered with a
 * `400`. The response's OWN `key` field means something entirely different
 * — it's the newly created task's key — so the same name carries two
 * unrelated meanings across one request/response pair. This action hides
 * the duplication: callers supply `boxKey` once.
 */
interface Input {
  boxKey: string;
  text: string;
  dueDate?: number;
  assignedToEmails?: string[];
}

const taskCreate: ActionDefinition<Input> = {
  key: "task-create",
  type: "perform",
  resource: "task",
  title: "Create Task",
  description: "Add a task to a box.",
  idempotent: false,
  params: [
    boxKeyParam,
    { key: "text", label: "Task Text", type: "string", required: true },
    {
      key: "dueDate",
      label: "Due Date",
      type: "number",
      advanced: true,
      hint: "Milliseconds since epoch, e.g. 1504213700003.",
    },
    {
      key: "assignedToEmails",
      label: "Assign To (emails)",
      type: "array",
      item: { type: "string" },
      advanced: true,
    },
  ],
  output: [{ key: "data", type: "object", label: "The created task" }],

  execute(input, ctx) {
    return new StreakClient(ctx).sendJson(
      "POST",
      `/boxes/${encodeId(input.boxKey)}/tasks`,
      {
        // Documented as required and named "Box key" — duplicates the path
        // parameter. See this file's top comment.
        key: input.boxKey,
        text: input.text,
        dueDate: input.dueDate,
        assignedToSharingEntries: input.assignedToEmails?.map((email) => ({ email })),
      },
    );
  },
};

export default taskCreate;
