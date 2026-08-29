import type { ActionDefinition } from "@w6w/types";
import { hostFromConnection, WrikeClient } from "../lib/client.ts";
import { taskIdParam } from "../lib/params.ts";

/**
 * `POST /tasks/{taskId}/timelogs` — book time against a task.
 *
 * `hours` must fall in Wrike's documented `[0..24]` range and `trackedDate` is
 * a bare date (`yyyy-MM-dd`), not a timestamp. `comment` is required by this
 * endpoint even though it is optional on Update Timelog — asymmetric, but
 * that is what Wrike's own OpenAPI document specifies for each. Not
 * idempotent: no idempotency key is documented, so a retry books time twice.
 */
interface Input {
  taskId: string;
  hours: number;
  trackedDate: string;
  comment: string;
  categoryId?: string;
  onBehalfOf?: string;
}

const timelogCreate: ActionDefinition<Input> = {
  key: "timelog-create",
  type: "perform",
  resource: "timelog",
  title: "Create Timelog",
  description: "Book time against a task.",
  idempotent: false,
  params: [
    taskIdParam,
    {
      key: "hours",
      label: "Hours",
      type: "number",
      required: true,
      validation: { min: 0, max: 24 },
      hint: "Wrike's documented range is 0–24 hours per entry.",
    },
    {
      key: "trackedDate",
      label: "Date tracked",
      type: "date",
      required: true,
      hint: "Format yyyy-MM-dd — the day the time applies to, not a timestamp.",
    },
    { key: "comment", label: "Comment", type: "string", required: true },
    { key: "categoryId", label: "Timelog category ID", type: "string", advanced: true },
    {
      key: "onBehalfOf",
      label: "On behalf of user ID",
      type: "string",
      advanced: true,
      hint: "Create the entry for another user instead of the requesting one.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Timelog ID" },
    { key: "hours", type: "number", label: "Hours" },
    { key: "trackedDate", type: "string", label: "Date tracked" },
  ],

  execute(input, ctx) {
    const host = hostFromConnection(ctx.connection);
    ctx.log("info", "creating Wrike timelog", { taskId: input.taskId, hours: input.hours });
    return new WrikeClient(ctx, host).one(
      `/tasks/${encodeURIComponent(input.taskId)}/timelogs`,
      {
        method: "POST",
        query: {
          hours: input.hours,
          trackedDate: input.trackedDate,
          comment: input.comment,
          categoryId: input.categoryId,
          onBehalfOf: input.onBehalfOf,
        },
      },
    );
  },
};

export default timelogCreate;
