import type { ActionDefinition } from "@w6w/types";
import { hostFromConnection, WrikeClient } from "../lib/client.ts";
import { timelogIdParam } from "../lib/params.ts";

/** `PUT /timelogs/{timelogId}` — edit an existing timelog record. All fields optional. */
interface Input {
  timelogId: string;
  hours?: number;
  trackedDate?: string;
  comment?: string;
  categoryId?: string;
}

const timelogUpdate: ActionDefinition<Input> = {
  key: "timelog-update",
  type: "perform",
  resource: "timelog",
  title: "Update Timelog",
  description: "Edit an existing timelog record's hours, date, comment or category.",
  idempotent: true,
  params: [
    timelogIdParam,
    { key: "hours", label: "Hours", type: "number", validation: { min: 0, max: 24 } },
    { key: "trackedDate", label: "Date tracked", type: "date" },
    { key: "comment", label: "Comment", type: "string" },
    { key: "categoryId", label: "Timelog category ID", type: "string", advanced: true },
  ],
  output: [
    { key: "id", type: "string", label: "Timelog ID" },
    { key: "hours", type: "number", label: "Hours" },
  ],

  execute(input, ctx) {
    const host = hostFromConnection(ctx.connection);
    return new WrikeClient(ctx, host).one(`/timelogs/${encodeURIComponent(input.timelogId)}`, {
      method: "PUT",
      query: {
        hours: input.hours,
        trackedDate: input.trackedDate,
        comment: input.comment,
        categoryId: input.categoryId,
      },
    });
  },
};

export default timelogUpdate;
