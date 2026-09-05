import type { ActionDefinition } from "@w6w/types";
import { calendarUid } from "../lib/params.ts";
import { unwrapFirst, ZohoCalendarClient } from "../lib/client.ts";

interface Input {
  calendarUid: string;
}

const calendarDelete: ActionDefinition<Input, Record<string, unknown>> = {
  key: "calendar-delete",
  type: "perform",
  resource: "calendar",
  title: "Delete Calendar",
  description: "Delete a calendar by uid.",
  idempotent: true,
  params: [calendarUid],
  output: [{ key: "calstatus", type: "string", label: "Result" }],

  async execute(input, ctx) {
    const body = await new ZohoCalendarClient(ctx).request<Record<string, unknown>>(
      `/calendars/${encodeURIComponent(input.calendarUid)}`,
      { method: "DELETE" },
    );
    return unwrapFirst(body, "calendars", "delete calendar");
  },
};

export default calendarDelete;
