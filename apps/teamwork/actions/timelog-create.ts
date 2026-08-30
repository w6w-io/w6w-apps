import type { ActionDefinition } from "@w6w/types";
import { TeamworkClient, unset } from "../lib/client.ts";

interface Input {
  taskId: number;
  date: string;
  hours: number;
  minutes?: number;
  description?: string;
  isBillable?: boolean;
  userId?: number;
}

const timelogCreate: ActionDefinition<Input> = {
  key: "timelog-create",
  type: "perform",
  resource: "timelog",
  title: "Log Time",
  description: "Log time against a task.",
  // Every call logs a NEW time entry; Teamwork has no way to converge a
  // retry onto the same one.
  idempotent: false,
  params: [
    { key: "taskId", label: "Task ID", type: "number", required: true },
    { key: "date", label: "Date", type: "date", required: true, hint: "Format: YYYY-MM-DD." },
    { key: "hours", label: "Hours", type: "number", required: true, row: "duration" },
    {
      key: "minutes",
      label: "Minutes",
      type: "number",
      row: "duration",
      validation: { min: 0, max: 59, integer: true },
    },
    { key: "description", label: "Description", type: "text", config: { multiline: true } },
    { key: "isBillable", label: "Billable", type: "boolean" },
    {
      key: "userId",
      label: "Logged for user ID",
      type: "number",
      advanced: true,
      hint: "Defaults to the connected user.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Time entry ID" },
    { key: "STATUS", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    return new TeamworkClient(ctx).request(`/projects/api/v3/tasks/${input.taskId}/time.json`, {
      method: "POST",
      body: {
        timelog: {
          date: input.date,
          hours: input.hours,
          minutes: input.minutes ?? 0,
          description: unset(input.description),
          isBillable: input.isBillable,
          userId: input.userId,
        },
      },
    });
  },
};

export default timelogCreate;
